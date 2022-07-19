// MYTICKETS


async function onCashout(evt, trx){
	console.log('Cashout', trx);
	let btn = evt.target;
	let idx = btn.parentNode.parentNode.rowIndex+1;
	let bdy = $('list-tickets').tBodies[0];
	let row = bdy.insertRow(idx);
	row.innerHTML = '<td colspan="7">Wait while we cashout your winnings...</td>';
	btn.disabled  = true;
	try {
		// Get transaction and ticket id
		let inf = await getTransaction(trx);
		console.warn('TRX', inf);
		if(!inf.ok){
			btn.innerHTML = 'ERROR';
			row.innerHTML = '<td colspan="7">ERROR: '+inf.error+'</td>';
			return;
		}
		let tid = parseInt(inf.topics[1],16);
		console.warn('TID', tid);
		let tix = await getTicketInfo(tid);
		console.warn('TIX', tix);
		if(tix.error){
			btn.innerHTML = 'ERROR';
			row.innerHTML = '<td colspan="7">'+tix.error+'</td>';
			return;
		}
		if(tix.player!=session.address){
			btn.innerHTML = 'ERROR';
			row.innerHTML = '<td colspan="7">Wallet does not match ticket owner</td>';
			return;
		}
		if(tix.status==1){
			btn.innerHTML = 'ERROR';
			row.innerHTML = '<td colspan="7">Ticket already paid</td>';
			return;
		}
		if(tix.status==2){
			btn.innerHTML = 'ERROR';
			row.innerHTML = '<td colspan="7">Invalid ticket</td>';
			return;
		}
		let res = await fetch('/api/getevent/'+tix.eventid);
		let evt = await res.json();
		console.warn('EVT', evt);
		if(evt.error){
			btn.innerHTML = 'ERROR';
			row.innerHTML = '<td colspan="7">ERROR: '+evt.error+'</td>';
			return;
		}
		if(tix.choice!=evt.winner){
			btn.innerHTML = 'ERROR';
			row.innerHTML = '<td colspan="7">Not a winning ticket</td>';
			return;
		}
		let ctr = await tronWeb.contract().at(config.bookid);
		let rcp = await ctr.payout(tid).send({ feeLimit: 100*SUNS });
		console.log('RCP', rcp);
		if(rcp && rcp.length==64){
			inf = {ok:true, trx:rcp};
			let rey = await fetch(`/api/cashout/${trx}/${rcp}`);
			let rez = await rey.json();
			console.log('REZ', rez);
			btn.innerHTML = 'PAID';
			row.innerHTML = `<td colspan="7">Winnings <a target="_blank" href="${config.explorer}/#/transaction/${rcp}">cashed out</a>, check your <a target="_blank" href="${config.explorer}/#/address/${session.address}">balance</a>!</td>`;
			showBalance();
		} else {
			btn.innerHTML = 'ERROR';
			row.innerHTML = '<td colspan="7">Error cashing out ticket</td>';
		}
	} catch(ex) {
		console.log('Error', ex);
		btn.innerHTML = 'ERROR';
		row.innerHTML = '<td colspan="7">ERROR: '+(ex.message||'Rejected by user')+'</td>';
	}
}

async function onRefund(evt, trx){
	console.log('Refund', trx);
	let btn = evt.target;
	let idx = btn.parentNode.parentNode.rowIndex+1;
	let bdy = $('list-tickets').tBodies[0];
	let row = bdy.insertRow(idx);
	row.innerHTML = '<td colspan="7">Wait while we refund your ticket...</td>';
	btn.disabled  = true;
	try {
		// Get transaction and ticket id
		let inf = await getTransaction(trx);
		console.warn('TRX', inf);
		if(!inf.ok){
			btn.innerHTML = 'ERROR';
			row.innerHTML = '<td colspan="7">ERROR: '+inf.error+'</td>';
			return;
		}
		let tid = parseInt(inf.topics[1],16);
		console.warn('TID', tid);
		let tix = await getTicketInfo(tid);
		console.warn('TIX', tix);
		if(tix.error){
			btn.innerHTML = 'ERROR';
			row.innerHTML = '<td colspan="7">'+tix.error+'</td>';
			return;
		}
		if(tix.player!=session.address){
			btn.innerHTML = 'ERROR';
			row.innerHTML = '<td colspan="7">Wallet does not match ticket owner</td>';
			return;
		}
		if(tix.status==1){
			btn.innerHTML = 'ERROR';
			row.innerHTML = '<td colspan="7">Ticket already paid</td>';
			return;
		}
		if(tix.status==2){
			btn.innerHTML = 'ERROR';
			row.innerHTML = '<td colspan="7">Invalid ticket</td>';
			return;
		}
		let res = await fetch('/api/getevent/'+tix.eventid);
		let evt = await res.json();
		console.warn('EVT', evt);
		if(evt.error){
			btn.innerHTML = 'ERROR';
			row.innerHTML = '<td colspan="7">ERROR: '+evt.error+'</td>';
			return;
		}
		if(evt.status!=4){
			btn.innerHTML = 'ERROR';
			row.innerHTML = '<td colspan="7">Event was not cancelled</td>';
			return;
		}
		let ctr = await tronWeb.contract().at(config.bookid);
		let rcp = await ctr.refund(tid).send({ feeLimit: 100*SUNS });
		console.log('RCP', rcp);
		if(rcp && rcp.length==64){
			inf = {ok:true, trx:rcp};
			let rey = await fetch(`/api/refund/${trx}/${rcp}`);
			let rez = await rey.json();
			console.log('REZ', rez);
			btn.innerHTML = 'PAID';
			row.innerHTML = `<td colspan="7">Ticket <a target="_blank" href="${config.explorer}/#/transaction/${rcp}">refunded</a>, check your <a target="_blank" href="${config.explorer}/#/address/${session.address}">balance</a>!</td>`;
			showBalance();
		} else {
			btn.innerHTML = 'ERROR';
			row.innerHTML = '<td colspan="7">Error refunding ticket</td>';
		}
	} catch(ex) {
		btn.innerHTML = 'ERROR';
		row.innerHTML = '<td colspan="7">ERROR: '+ex.message+'</td>';
	}
}


async function initEvents() {
	console.log('MyTickets loaded');
}

// END