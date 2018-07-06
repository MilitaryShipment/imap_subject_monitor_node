const Imap = require('imap'), inspect = require('util').inspect, prompt = require('prompt'), opn = require('opn');

var GBL = '';
var alertPath = '';
var imap;
var pastSubjects = [];

function openInbox(cb){
    imap.openBox('INBOX',true,cb);
}
function parseMsg(msg,seqno){
    var prefix = '(#' + seqno + ') ';
    msg.on('body',buildStream);
    msg.once('attributes',(attrs)=>{/*console.log(prefix + 'Attributes: %s',inspect(attrs,false,8));*/});
    msg.once('end',()=>{/*console.log(prefix + 'Finished');*/});
}
function buildStream(stream,info){
    var buffer = '';
    stream.on('data',(chunk)=>{
        buffer += chunk.toString('utf8');
    });
    stream.once('end',()=>{
        var header = inspect(Imap.parseHeader(buffer)).replace(/'/g,'"').replace(/([a-z]+)(: ?[\[\n])/g, '"$1"$2');
        var headerObj = JSON.parse(header);
        interpretSubject(headerObj.subject.toString());
    });
}
function interpretSubject(subject){
    var pattern = new RegExp(GBL);
    var result = subject.match(pattern);
    if(result !== null){
        var index = pastSubjects.indexOf(result.input)
        if(index === -1){
            var currentDate = new Date();
            console.log("Match Found at: " + currentDate.toLocaleTimeString());
            pastSubjects.push(result.input);
            opn(alertPath).then(()=>{/*closed*/});
        }
    }
}

function initImap(username,password){
    imap = new Imap(
        {
            user:'' + username,
            password:password,
            host:'mail.allamericanmoving.com',
            port:993,
            autotls:'always',
            tls:true
        }
    );
    imap.once('ready',function(){
        openInbox(function(err,box){
            if(err) throw err;
            var currentDate = new Date();
            console.log('Checking ' + GBL + " at: " + currentDate.toLocaleTimeString());
            var f = imap.seq.fetch(box.messages.total - 10 + ':*', {bodies: ['HEADER.FIELDS (SUBJECT)'],struct:true});
            f.on('message',parseMsg);
            f.once('error',(err)=>{
                console.log('Fetch Error: ' + err);
            });
            f.once('end',()=>{
                // console.log('Done Fetching all messages!');
            imap.end();
            });
        });
    });
    imap.once('error',function(err){console.log(err);});
    imap.once('end',function(){/*console.log('Connection ended.');*/});
    imap.connect();
}

prompt.start();
prompt.get(['username','password','gbl','alertPath'],(err,result)=> {
    if(err) throw err;
    var currentDate = new Date();
    GBL = result.gbl;
    alertPath = result.alertPath;
    console.log("Running at: " + currentDate.toLocaleTimeString());
    initImap(result.username,result.password);
    setInterval(()=>{initImap(result.username,result.password);},2000);
});
