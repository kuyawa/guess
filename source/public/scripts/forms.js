// On play

function validNumber(text='') {
    let number, value;
    //let sep = Intl.NumberFormat(navigator.language).format(1000).substr(1,1) || ',';
    let sep = ',';
    if(sep==','){ value = text.replace(/\,/g,''); }
    else if(sep=='.'){ value = text.replace(/\./g,'').replace(',','.'); }
    try { number = parseFloat(value) || 0.0; } catch(ex){ console.log(ex); number = 0.0; }
    return number;
}

function getEventInfo(evtid, opt){
	return session.events[evtid];
}

function setBet(num){
	$('play-amount').value = num;
}

function onPlay(evtid, opt){
	console.log('ON PLAY', evtid, opt);
	//if(!session.myaccount){ console.log('No wallet?'); return; }
	let event  = session.events[evtid];
	if(!event){ console.log('No event?'); return; }
	let league = event.league;
	if(!league){ console.log('No league?'); return; }
	if(opt==3 && settings.draw.indexOf(league)<0){ console.log('No draw?'); return; }
	console.log('League', league, 'Option', opt, 'Status', event.status, 'Event', event);
	switch(event.status){
		case 0: alert('Event not open yet, try again later'); break;
		case 1: showPlay(league, evtid, opt); break;
		case 2: alert('Event closed, wait for final results'); break;
		case 3: showCash(league, evtid, opt); break;
		case 4: showBack(league, evtid, opt); break;
		default : break;
	}
}

// Pay Form

async function showPlay(league, eventid, opt){
	showMessage('');
	$('play-send').disabled = false;
	$('play-modal').style.display = 'block';
	$('play-eventid').value = eventid;
	//let info = await getEventInfo(eventid); // get odds/sales?
	let info = session.events[eventid];
	if(info){
		let odds = 200;
		switch(opt){
			case 1: title = info.team1; break;
			case 2: title = info.team2; break;
			case 3: title = 'DRAW';     break;
			default: odds = 200;
		}

		// recalc all this <<<<<<
	    /*
		// Odds
    	let total  = parseInt(info.total||'0') / SUNS;

		// Option 0
		let opt0   = info.options[0];
		let title0 = info.options[0].title;
	    let votes0 = parseInt(opt0.total||'0') / SUNS;
		let odds0  = (votes0>0 ? parseInt(total*100/votes0) : 200);
		let oddsX  = 200;
		let odds1  = 200;
		let title  = '?';
		let title1 = '?';
		let titleX = '?';
		let sel0   = 0;

		if(info.options.length==2){ 
			console.log('2 OPTs');
			// Option 1
			let opt1   = info.options[1];
		    let votes1 = parseInt(opt1.total||'0') / SUNS;
			odds1  = (votes1>0 ? parseInt(total*100/votes1) : 200);
			title1 = info.options[1].title;
			sel1 = 1;
		} else {
			console.log('3 OPTs');
			// Option X Draw
			let optX   = info.options[1];
		    let votesX = parseInt(optX.total||'0') / SUNS;
			oddsX  = (votesX>0 ? parseInt(total*100/votesX) : 200);
			titleX = info.options[1].title;
			selX   = 1;
			// Option 1
			let opt1   = info.options[2];
		    let votes1 = parseInt(opt1.total||'0') / SUNS;
			odds1  = (votes1>0 ? parseInt(total*100/votes1) : 200);
			title1 = info.options[2].title;
			sel1   = 2;
		}
		let odds = 200;
		switch(opt){
			case 0: title = title1; odds = odds1; option = sel1; break;
			case 1: title = titleX; odds = oddsX; option = selX; break;
			case 2: title = title2; odds = odds2; option = sel2; break;
			default: odds = 200;
		}
		*/
		$('play-team').innerHTML = title;
		$('play-option').value   = opt;
		$('play-odds').innerHTML = odds;
		$('play-ubet').innerHTML = 'You bet 100 - You win ' + odds;
	}
}

function hideForm(){
	$('play-modal').style.display = 'none';
}

function ignoreClick(){
	console.log('Ignore')
	window.event.stopPropagation();
	window.event.preventDefault();
}


function addTicket(eid, ply, pik, amt, trx){
	let evt = session.events[eid];
	if(!evt){ console.log('No event for this ticket?'); return; }
	let tmp = $('ui-row-bet').innerHTML;
	let url = config.explorer+'/#/transaction/'+trx;
	let tim = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
	let tm1 = evt.team1;
	let tm2 = evt.team2;
	let pk1 = pik==1?'pick':'';
	let pk2 = pik==2?'pick':'';
	let pyr = ply.substr(0,8);
	let row = tmp.replace('{eventid}', eid)
	             .replace('{trxurl}',  url)
	             .replace('{time}',    tim)
	             .replace('{pick1}',   pk1)
	             .replace('{team1}',   tm1)
	             .replace('{pick2}',   pk2)
	             .replace('{team2}',   tm2)
	             .replace('{amount}',  amt)
	             .replace('{player}',  pyr);
    let bod = $('list-tickets').tBodies[0];
	let htm = bod.innerHTML;
	if(bod.rows[0].cells.length==1){
    	bod.innerHTML = row;
	} else {
    	bod.innerHTML = row + htm;
	}
}

async function buyTicket(evtid, choice, amount) {
	let inf = {ok:false, error:'Unknown'};
	try {	
		let sun = amount * SUNS;
		let ctr = await tronWeb.contract().at(config.bookid);
		let res = await ctr.newTicket(evtid, choice).send({
		    feeLimit: 100*SUNS,
		    callValue: sun
		});
		console.log('RES', res);
		if(res && res.length==64){
			let trx = res;
			inf = {ok:true, trx:trx};  //ea2d4e142867bfb074999463ca24c0aa204f8fa45c06a67a9d99bc1cfc873468
			// save to db, calc odds, calc sales
			let dat = {eventid:evtid, player:session.address, choice:choice, amount:amount, trxid:trx};
    		let opt = {method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(dat)};
			//let rex = await fetch('/api/newticket/'+trx);
			let rex = await fetch('/api/newticket', opt);
			let rey = await rex.json();
			console.log('REX', rey);
		} else {
			inf = {ok:false, error:'Unknown error', res:res};
		}
	} catch(ex) {
		inf = {ok:false, error:ex.message};
		console.error('ERROR', ex);
	}
	return inf;
}

async function placeBet(){
	console.log('Betting...');
	showMessage();
	let eventid = $('play-eventid').value;
	let choice  = $('play-option').value;
	let amount  = validNumber($('play-amount').value);
	console.log('Ticket', eventid, choice, amount);
	if(amount<=0){ 
		showMessage('Amount must be greater than zero');
		return;
	}
	$('play-send').disabled = true;
	showMessage('Wait, placing bet');
	let res = await buyTicket(eventid, choice, amount);
	console.log('RES', res);
	if(res.ok){
		showMessage(`BET SENT!<br><a target="_blank" href="${config.explorer}/#/transaction/${res.trx}"><small>ID: ${res.trx.substr(0,10)}</small></a>`);
		addTicket(eventid, session.address, choice, amount, res.trx);
		updateOdds(eventid, choice, amount);
	} else { 
		showMessage('Error placing bet');
	}
}

function showMessage(text) {
	$('play-message').innerHTML = text||'';
}


//---- REFUND

async function showBack(league, eventid, opt){
	console.log('Refund', league, eventid, opt);
	showBackMsg('');
	$('back-send').disabled  = true;
	$('back-team').innerHTML = 'WAIT';
	$('back-eventid').value  = eventid;
	$('back-modal').style.display = 'block';
	let info = await getEventInfo(eventid, session.myaccount);
	console.log('Info', info);
	if(info){
		if(info.status !=3) { console.log('Event not cancelled'); return; }
    	let bet = 0;
	    for (var i = 0; i < info.options.length; i++) {
	    	bet += info.options[i].myvotes;
	        console.log('Myvotes', info.options[i].myvotes);
	    }
	    console.log('My bet', bet);
		$('back-team').innerHTML = info.title;
		let back = 0;
    	if(bet>0){
    		back = bet / SUNS;
	        console.log('Refund', back);
			$('back-amount').value   = back.toFixed(4);
			$('back-ubet').innerHTML = `You bet ${back.toFixed(4)}`;
			$('back-send').disabled  = false;
    	} else {
    		back = '0.00';
	        console.log('No refund');
			$('back-amount').value   = back;
			$('back-ubet').innerHTML = `No bets`;
			$('back-send').disabled  = true;
    	}
	}
}

function hideBack(){
	$('back-modal').style.display = 'none';
}

function showBackMsg(text) {
	$('back-message').innerHTML = text;
}


//---- CASH OUT

async function showCash(league, eventid, opt){
	console.log('Cashout', league, eventid, opt);
	showCashMsg('');
	$('cash-team').innerHTML = 'WAIT';
	$('cash-modal').style.display = 'block';
	$('cash-eventid').value = eventid;
	let info = await getEventInfo(eventid, session.myaccount);
	console.log('Info', info);
	if(info){
		if(info.status !=4) { console.log('Event not finalized'); return; }
    	let total  = parseInt(info.total||'0') / SUNS;
    	let odds   = 200;
    	let winner = parseInt(info.winner);
    	let team   = info.options[winner].short;
    	let winbet = info.options[winner].myvotes / SUNS;
    	let won    = winbet > 0;
    	// Odds
	    for (var i = 0; i < info.options.length; i++) {
	        let opt = info.options[i];
	        //let tickets = parseInt(opt.tickets||'0');
	        let votes   = parseInt(opt.total||'0') / SUNS;
	        let myvotes = parseInt(opt.myvotes||'0') / SUNS;
	        let odds    = (votes>0 ? parseInt(total*100/votes) : 200);
	        let rate    = (votes>0 ? parseInt(votes*100/total) : 0);
	        info.options[i].odds = odds;
	        info.options[i].rate = rate;
	        console.log('Odds', odds, rate)
	    }
		$('cash-team').innerHTML = team;
		$('cash-option').value   = option;
		$('cash-odds').innerHTML = info.options[winner].odds;
	    let cash = 0;
    	if(won){
            cash = winbet * info.options[winner].odds / 100;
    		//cash = winbet * info.options[winner].rate;
	        console.log('Cash', cash);
			$('cash-amount').value   = cash.toFixed(4);
			$('cash-ubet').innerHTML = `You bet ${winbet.toFixed(4)} - You won ${cash.toFixed(4)}`;
			$('cash-send').disabled  = false;
    	} else {
    		cash = '0.00';
			$('cash-amount').value   = cash;
			$('cash-ubet').innerHTML = `No bets`;
			$('cash-send').disabled  = true;
    	}
	}
}

function hideCash(){
	$('cash-modal').style.display = 'none';
}

function showCashMsg(text) {
	$('cash-message').innerHTML = text;
}

async function cashout(){
	let event  = $('cash-eventid').value;
	let option = $('cash-option').value;
	showCashMsg('Wait, cashing out');
	let res = null;
	try{
		res = await eventCashout(event,
			function(msg)     { showCashMsg('CASHED OUT!'); }, 
			function(msg, tx) { showCashMsg('Error: '+ex.message); }
		);
	} catch(ex){
		console.log('Error cashing out', ex);
		showCashMsg('Error: '+ex.message);
	}
	console.log('Cashout done');
}
