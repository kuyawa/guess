// main.js

const SUNS = 1000000;

let settings = {
    status  : ['Setup', 'Open', 'Live', 'Final', 'PPD'],
    draw    : ['USAMLBX', 'CHNCSL', 'ENGPRM', 'ESPLIG', 'FRALIG', 'GERBUN', 'ITASER', 'USAMLS', 'UFC', 'WCP'],  // accepts draw?
    home    : ['USAMLS', 'ESPLIG', 'FRALIG', 'ITASER', 'GERBUN', 'ENGPRM'],  // team1 is home
    logs    : {
        open: '?',
        bets: '?'
    }
}

var session = {
    address    : null,
    currentDate: new Date(),
    salesDate  : new Date(),
    events     : {},
    tickets    : {},
    isMobile   : false,
    network    : 'testnet'
}


function $(id) { return document.getElementById(id); }

function setCookie(name, value, days) {
    var expires = "";
    if (days) {
        var date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        expires = "; expires=" + date.toUTCString();
    }
    document.cookie = name + "=" + (value || "") + expires + "; path=/";
}

function getCookie(name) {
    let value = null;
    var nameEQ = name + "=";
    var ca = document.cookie.split(';');
    for (var i = 0; i < ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0) == ' ') { c = c.substring(1, c.length); }
        if (c.indexOf(nameEQ) == 0) { value = c.substring(nameEQ.length, c.length); break; }
    }
    return value;
}

async function onConnect() {
	if(!tronLink){ alert('TronLink wallet is required\nInstall the browser extension'); return; }
	let res = await tronLink.request({method: 'tron_requestAccounts'});
	console.log('LOGIN', res);
	switch(res.code){
		case  200: console.log('User accepted'); afterAccount(tronWeb.defaultAddress.base58); break;
		case 4000: console.log('User in queue'); afterAccount(tronWeb.defaultAddress.base58); break;
		case 4001: console.log('User rejected'); break;
	}
}

async function getBalance(adr){
    let bal = 0;
    let res = await tronWeb.trx.getAccount(adr);
    console.log('RES', res);
    console.log('HEX', res.address);
    console.log('BAL', res.balance/SUNS, res.balance);
    if(res.balance){ bal = res.balance/SUNS; }
    return bal;
}

async function showBalance(){
    let balance = await getBalance(session.address);
    console.log('Balance', balance);
    $('user-address').innerHTML = session.address.substr(0,10) + ' - ' + balance.toLocaleString({minimumFractionDigits:2, maximumFractionDigits:2}) + ' TRX';
}

async function afterAccount(adr){
    setCookie('address', adr);
    session.address = adr;
    showBalance();
}

async function removeAccount(){
    setCookie('address', '');
    session.address = null;
    $('user-address').innerHTML = 'Connect Wallet - 0.0000 TRX';
}

async function sendMoney(destin, amount) {
    //let trx = await tronWeb.transactionBuilder.sendTrx(destin, amount);
    //let raw = await tronWeb.trx.sign(trx);
    //let res = await tronWeb.trx.sendRawTransaction(raw);
    // one step
    let res = await tronWeb.trx.sendTransaction(destin, amount);
    console.log(res);
}

async function sendToken(token, destin, amount) {
    let res = await tronWeb.trx.sendToken(destin, amount, token);
    console.log(res);
}

async function handleEvents(){
    window.addEventListener('message', function (e) {
        if(!e.data.isTronLink){ return; }
        //console.log('- Message received', e.data);
        if(!e.data.message){ console.log('No message'); return; }
        let msg = e.data.message;
        let act = msg.action;
        console.log('-', act, msg);

        switch(act){
        case 'tabReply':
            //if (msg.data.data.node?.chain == '_'){
            let net = msg.data.data.node?msg.data.data.node.name:'';
            let adr = msg.data.data.address || '';
            let nam = msg.data.data.name || '';
            if(net){
	            console.log('Network:', net);
	            console.log('Address:', adr);
	            console.log('Wallets:', nam);
            }
            if(adr){
                afterAccount(adr);
            }
            break;

        case 'setAccount':
            console.log("Address:", msg.data.address)
            afterAccount(msg.data.address);
        	break;

        case 'setNode':
            if (msg.data.node.chain == '_'){
                console.log("Main chain")
            } else 	{
                console.log("Test chain")
            }
        	break;
        
        case 'connect':
            console.log("Connected")
        	break;
          
        case 'disconnect':
            console.log("Disconnected")
            removeAccount();
        	break;
          
        case 'connectWeb':
            afterAccount(msg.data.address);
        	break;
          
        case 'accountsChanged':
            afterAccount(msg.data.address);
        	break;
          
        case 'acceptWeb':
            afterAccount(msg.data.address);
        	break;

        case 'disconnectWeb':
            removeAccount();
            // After disconnect here...
            // Delete address from session, localStorage or cookie
        	break;
          
        case 'rejectWeb':
        	// Do something
        	break;
        }
    });
}

function fromHex(hex) {
    var str = '';
    for (var i=0; i<hex.length; i+=2) {
        var v = parseInt(hex.substr(i, 2), 16);
        if(v){ str += String.fromCharCode(v); }
    }
    return str;
}

async function getTransaction(trx){
    let inf = {ok:false, error:'Unknown'};
    try{
        console.warn('TRX', trx);
        let rec = await tronWeb.trx.getTransactionInfo(trx);
        //console.warn('Receipt', rec);
        //console.warn('Result', rec.receipt?.result || 'Not ready');
        if(rec.receipt.result=='REVERT'){
            let msg = fromHex('0x'+rec.resMessage);
            console.warn('Revert', msg);
            inf = {ok:false, error:msg};
        } else {
            //console.warn('DATA', rec.log[0].data);
            //console.warn('TOPICS', rec.log[0].topics);
            let data   = rec.log[0].data
            let topics = rec.log[0].topics;
            inf = {ok:true, trx, data, topics};
        }
    } catch(ex) {
        console.warn('Error', ex);
        inf = {ok:false, error:ex.message};
    }
    return inf;
}

async function getTicketInfo(tid) {
    //console.warn('TicketInfo', tid);
    let rec = null;
    try{
        let adr = config.bookid;
        let wlt = session.address;
        let fun = 'getTicketById(uint256)';
        let opt = { feeLimit: 1000000000 };
        let par = [{type: 'uint256', value: tid}];
        let hex = tronWeb.address.toHex(wlt);
        let res = await tronWeb.transactionBuilder.triggerSmartContract(adr,fun,opt,par,hex);
        console.warn('Ticket', res);
        if(res.result.result){
            let dat = res.constant_result[0];
            let l01 = dat.substr(  0,64);  // ticketid
            let l02 = dat.substr( 64,64);  // eventid
            let l03 = dat.substr(128,64);  // date of purchase
            let l04 = dat.substr(192,64);  // player
            let l05 = dat.substr(256,64);  // amount
            let l06 = dat.substr(320,64);  // choice
            let l07 = dat.substr(384,64);  // odds
            let l08 = dat.substr(448,64);  // winner
            let l09 = dat.substr(512,64);  // winnings
            let l10 = dat.substr(576,64);  // status
            // Data
            let xid = parseInt(l01,16);
            let eid = parseInt(l02,16);
            let tim = parseInt(l03,16);
            let dte = new Date(tim*1000);
            let ply = tronWeb.address.fromHex('0x'+l04.substr(24));
            let amt = parseInt(l05,16);
            let pik = parseInt(l06,16);
            let odd = parseInt(l07,16);
            let won = parseInt(l08,16)==1;
            let pay = parseInt(l09,16);
            let sta = parseInt(l10,16);

            rec = { ticketid: tid, eventid: eid, purchased: dte, player: ply, amount: amt, choice: pik, odds: odd, winner: won, winnings: pay, status: sta };
            //console.warn('TIXINF:', rec);
        }
    } catch(ex) {
        console.error('Error', ex);
        rec = {error:ex.message};
    }
    return rec;
}

async function main() {
	console.log('GU3SS is running...');
	handleEvents();
	if(window.tronWeb ){ console.log('TronWeb is ready'); }
	if(window.tronLink){ console.log('TronLink is ready'); }
    let adr = getCookie('address');
    if(adr){ afterAccount(adr); }
    initEvents(); // place in any script that will start extra process
}

window.onload = main;

// END