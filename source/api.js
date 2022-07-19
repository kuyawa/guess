let db = require('./database.js');

// TRON
let TronWeb = require('tronweb');
const tronweb = new TronWeb({
    fullHost: 'https://api.shasta.trongrid.io',
    privateKey: process.env.ADMINKEY
})

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
		let rec = await tronweb.trx.getTransactionInfo(trx);
		console.warn('Receipt', rec);
		//console.warn('Result', rec.receipt?.result || 'Not ready');
		if(rec.receipt?.result=='REVERT'){
			let msg = fromHex('0x'+rec.resMessage);
			console.warn('Revert', msg);
			inf = {ok:false, error:msg};
		} else {
			console.warn('DATA', rec.log[0].data);
			console.warn('TOPICS', rec.log[0].topics);
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

async function uploadEvents(lst) {
	let errcnt = 0;
	try {
		for (var i=0; i<lst.length; i++) {
			let evt = lst[i];
			let rex = await db.newEvent(evt);
			if(rex.status=='OK'){
				console.warn('Event', evt.eventid, 'OK');
			} else {
				console.warn('Error in event', evt.eventid, rex);
				errcnt += 1;
			}
		}
	} catch(ex) {
		console.error('ERROR:', ex);
		return {error:ex.message};
	}
	if(errcnt>0){
		return {status:'errors', errcount:errcnt};
	} else {
		return {status:'OK'};
	}
}

async function newEvent(evt) {
	try {
		console.warn('NEWEVT', evt);
		// Check evt do not exist
		let res = await db.getEvent(evt.eventid);
		if(res?.error){ console.error('ERRDB NEWEVT', evt.eventid, res); return; }
		if(res?.eventid>0){ console.warn('Event found', evt.eventid); return; }
		let rex = await db.newEvent(evt);
		if(rex.status=='OK'){
			console.warn('NEWEVT', evt.eventid, 'OK');
		} else {
			console.warn('ERRDB NEWEVT', evt.eventid, rex);
		}
	} catch(ex) {
		console.error('ERROR NEWEVT', evt.eventid, ex);
	}
}

async function closeEvent(evt) {
	let rex = await db.closeEvent(evt.eventid);
	console.warn('CLOSE', evt.eventid, rex);
}

async function cancelEvent(evt) {
	let rex = await db.cancelEvent(evt.eventid, 'RAIN');
	console.warn('CANCL', evt.eventid, rex);
}

async function finalEvent(evt) {
	let rex = await db.finalEvent(evt.eventid, evt.score1, evt.score2, evt.winner);
	console.warn('FINAL', evt.eventid, evt.team1, evt.team2, evt.score1, evt.score2, evt.winner, rex);
}

async function getEventInfo(eid) {
	let rec = null;
	try{
		let adr = process.env.BOOKID;
        let fun = 'getEventById(uint256)';
        let opt = { feeLimit: 1000000000 };
        let par = [{type: 'uint256', value: eid}];
        let wlt = 'TVMHHvhVD92Qm7uwpnhSDetQpKrjjM7zGW'; // Wallet
        let hex = tronweb.address.toHex(wlt);
		let res = await tronweb.transactionBuilder.triggerSmartContract(adr,fun,opt,par,hex);
		//console.warn('Event', res);
        if(res.result.result){
        	let dat = res.constant_result[0];
			let l01 = dat.substr(  0,64);
			let l02 = dat.substr( 64,64);
			let l03 = dat.substr(128,64);
			let l04 = dat.substr(192,64);
			let l05 = dat.substr(256,64);
			let l06 = dat.substr(320,64);
			let l07 = dat.substr(384,64);
			let l08 = dat.substr(448,64);
			let l09 = dat.substr(512,64);
			let l10 = dat.substr(576,64);
			let l11 = dat.substr(640,64);
			let l12 = dat.substr(704,64);
			let l13 = dat.substr(768,64);
			let l14 = dat.substr(832,64);
			let l15 = dat.substr(896,64);
			let l16 = dat.substr(960,64);
			let l17 = dat.substr(1024,64);
			//if(dat.length>13*64)
			let evi = parseInt(l02,16);
			let day = parseInt(l03,16);
			let tim = parseInt(l04,16);
			let sc1 = parseInt(l05,16);
			let sc2 = parseInt(l06,16);
			let win = parseInt(l07,16);
			let sta = parseInt(l08,16);
			let lge = fromHex(l13);
			let tm1 = fromHex(l15);
			let tm2 = fromHex(l17);
			let dte = new Date(tim*1000).toJSON();
			// DB Record
			rec = {
				eventid: evi,
				day    : day,
				date   : dte,
				league : lge,
				team1  : tm1,
				team2  : tm2,
				score1 : sc1,
				score2 : sc2,
				winner : win,
				status : sta
			}
			console.warn('EVTINF:', evi, lge, tm1, tm2, sc1, sc2, win, sta, new Date(tim*1000).toJSON(), tim, day);
        }
	} catch(ex) {
		console.error('Error', ex);
	}
	return rec;
}

async function getTicketInfo(tid) {
	console.warn('TicketInfo', tid);
	let rec = null;
	try{
		let adr = process.env.BOOKID;
        let fun = 'getTicketById(uint256)';
        let opt = { feeLimit: 1000000000 };
        let par = [{type: 'uint256', value: tid}];
        let wlt = 'TVMHHvhVD92Qm7uwpnhSDetQpKrjjM7zGW'; // Wallet
        let hex = tronweb.address.toHex(wlt);
		let res = await tronweb.transactionBuilder.triggerSmartContract(adr,fun,opt,par,hex);
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
			let ply = tronweb.address.fromHex('0x'+l04.substr(24));
			let amt = parseInt(l05,16);
			let pik = parseInt(l06,16);
			let odd = parseInt(l07,16);
			let won = parseInt(l08,16)==1;
			let pay = parseInt(l09,16);
			let sta = parseInt(l10,16);

			rec = { ticketid: tid, eventid: eid, purchased: dte, player: ply, amount: amt, choice: pik, odds: odd, winner: won, winnings: pay, status: sta };
			console.warn('TIXINF:', rec);
		}
	} catch(ex) {
		console.error('Error', ex);
		rec = {error:ex.message};
	}
	return rec;
}

async function newTicket(rec) {
	let inf = {ok:false, error:'Unknown'};
	try {
		let rex = await db.newTicket(rec);
		console.warn('NEW TICKET', rex)
		inf = {ok:true, ticketid:rex.id};
	} catch(ex) {
		console.error('ERROR', ex);
		inf = {ok:false, error:ex.message};
	}
	return inf;
}

async function newTicketFromTx(tx) {
	let dat = await getTransaction(tx);
	console.warn('DAT', dat);
	if(!dat || !dat.ok){
		return {ok:false, error:'Error getting tx info'};
	}
	let ticketid = parseInt('0x'+dat.topics[1],16);
	let eventid  = parseInt('0x'+dat.topics[2],16);
	let player   = await tronweb.address.fromHex('0x'+topics[3].substr(24));
	//let player = '0x'+dat.topics[3].substr(24);
	let amount   = parseInt('0x'+dat.data.substr(64,64),16) / SUNS;
	let option   = parseInt('0x'+dat.data.substr(128),16);
	inf = {ok:true, ticketid:ticketid, eventid:eventid, player:player, amount:amount, option:option};
	let rex = await db.newTicket(inf);
	console.warn('REX', rex)
	return {ok:true, ticketid:ticketid};
}

async function payTicket(tid) {
	console.warn('payTicket - not implemented');
}

async function updateEvents(lst) {
	console.warn('Update events', lst);
	for (var i = 0; i < lst.length; i++) {
		let id  = lst[i];
		let evt = await getEventInfo(id);
		let rex = await newEvent(evt);
	}
}

async function updateScores(ids) {
	console.warn('Updating scores', ids);
	let lst = ids.split(':');
	for (var i = 0; i < lst.length; i++) {
		let id = lst[i];
		let evt = await getEventInfo(id);
		let rex;
		if(evt.status==3){
			rex = await db.finalEvent(evt.eventid, evt.score1, evt.score2, evt.winner);
			console.warn('SCORE UPDATED', evt.eventid, rex);
		} else if(evt.status==4){
			rex = await db.cancelEvent(evt.eventid, 'RAIN');
			console.warn('EVENT CANCELLED', evt.eventid, rex);
		} else {
			console.warn('STATUS UNKNOWN', evt.eventid, evt.status);
		}
	}
}

async function updateData(msg, id) {
	let evt, tix;
	switch(msg){
		case 'newevt': evt = await getEventInfo(id);  newEvent(evt);    break;
		case 'close' : evt = await getEventInfo(id);  closeEvent(evt);  break;
		case 'cancel': evt = await getEventInfo(id);  cancelEvent(evt); break;
		case 'final' : evt = await getEventInfo(id);  finalEvent(evt);  break;
		case 'newtix': tix = await getTicketInfo(id); newTicket(tix);   break;
		case 'paytix': tix = await getTicketInfo(id); payTicket(tix);   break;
		case 'events': updateEvents(id); break;
		case 'scores': updateScores(id); break;
		default: console.error('ERR MSG NOT FOUND');
	}
}

async function ticketCashout(trx, rcp, player) {
	if(!player){
		return {success:false, error:'Invalid player address'};	
	}
	let rex = {success:false, error:'unknown'};
	try {
		//let dat = await getTransaction(rcp);
		//console.warn('DAT', dat);
		//if(!dat || !dat.ok){
		//	return {success:false, error:'Error getting ticket receipt'};
		//}
		//let eventid  = parseInt('0x'+dat.topics[1],16);
		//let address  = await tronweb.address.fromHex('0x'+topics[2].substr(24));
		//let ticketid = parseInt('0x'+dat.data.substr(64,64),16);
		//let amount   = parseInt('0x'+dat.data.substr(128,64),16) / SUNS;
		//let tix = {success:true, eventid:eventid, ticketid:ticketid, player:address, amount:amount};
		//console.warn('TIX', tix);
		//let amount = 0;  // Can't get updated ticket info form contract after at least one minute
	    let ret = await db.ticketCashout(trx, rcp); // save winnings too
		//console.warn('RET', ret);
	    if(ret.error){
	    	rex = {success:false, error:ret.error};
	    } else {
	    	rex = {success:true};
	    }
	} catch(ex) {
	    rex = {success:false, error:ex.message};
	}
    return rex;
}

async function ticketRefund(trx, rcp, player) {
	if(!player){
		return {success:false, error:'Invalid player address'};	
	}
	let rex = {success:false, error:'unknown'};
	try {
	    let ret = await db.ticketRefund(trx, rcp); // save winnings too
		console.warn('RET', ret);
	    if(ret.error){
	    	rex = {success:false, error:ret.error};
	    } else {
	    	rex = {success:true};
	    }
	} catch(ex) {
	    rex = {success:false, error:ex.message};
	}
    return rex;
}

async function ticketsPending(player) {
	let lst = await db.ticketsPending(player);
	console.warn('Pending', lst);
	let inf = {};
	for (var i = 0; i < lst.length; i++) {
		let tix = lst[i];
		let tid = tix.ticketid;
		let trx = tix.payid;
		let dat = await getTransaction(trx);
		console.warn('DAT', dat);
		if(!dat || !dat.ok){
			inf[tid] = {ok:false, ticketid:tid, winnings:0, error:'Error getting ticket info'};
		} else {
			// get winings from contract logs?
			// save to db
		}
	}
	return inf;
}

module.exports = {
	uploadEvents,
	updateData,
	newTicket,
	newTicketFromTx,
	ticketCashout,
	ticketRefund,
	ticketsPending
};

// END