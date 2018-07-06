const Imap = require('imap'), inspect = require('util').inspect, prompt = require('prompt'), opn = require('opn');

var GBL = '';
var alertPath = '';
var imap = new Imap();

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
    console.log(pattern);
    var result = subject.match(pattern);
    if(result === null){
        console.log('No result');
    }else{
        opn(alertPath).then(()=>{
            //closed
        });
    }
}

prompt.start();
prompt.get(['username','password','gbl','alertPath'],(err,result)=> {
    if(err) throw err;
    GBL = result.gbl;
    alertPath = result.alertPath;
    imap = new Imap(
        {user:'aam\\' + result.username,
            password:result.password,
            host:'mail.allamericanmoving.com',
            port:993,
            autotls:'always',
            tls:true
        }
    );
    imap.once('ready',function(){
        openInbox(function(err,box){
            if(err) throw err;
            console.log('Ready...');
            var f = imap.seq.fetch(box.messages.total + ':*', {bodies: ['HEADER.FIELDS (FROM TO SUBJECT DATE)'],struct:true});
            f.on('message',parseMsg);
            f.once('error',(err)=>{
                console.log('Fetch Error: ' + err);
            });
            f.once('end',()=>{
                console.log('Done Fetching all messages!');
            imap.end();
            });
        });
    });
    imap.once('error',function(err){console.log(err);});
    imap.once('end',function(){console.log('Connection ended.');});
    imap.connect();
    setInterval(()=>{imap.connect();},5000);
});
