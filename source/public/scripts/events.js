// events.js

Date.prototype.addDays = function(days) {
    var date = new Date(this.valueOf());
    date.setDate(date.getDate() + days);
    return date;
}

function getNowLocal() {
	let x = new Date();
	let y = x.getTimezoneOffset();
	let z = y*60*1000;
	let now = new Date(x.getTime()-z);
	return now;
}

function getMonthName(date) {
	return date.toLocaleDateString([],{month: 'long'});
	//return (new Date(time)).toLocaleDateString([],{month: 'long'});
}

function getDayName(date) {
	return date.toLocaleDateString([],{weekday: 'short'}).toUpperCase();
}

function getDayNumber(date) {
	return date.getDate();
}

function getTime(date) {
	//console.log(date, typeof(date));
	let dd = new Date(date);
	let hh = dd.getHours();
	let mm = dd.getMinutes();
	let tt = hh.toString().padStart(2,'0')+':'+mm.toString().padStart(2,'0');
	return tt;
}

function getDate(date) {
	let cc  = date;
	let yy  = cc.getFullYear()
	let mm  = (''+(cc.getMonth()+1)).padStart(2, '0');
	let dd  = (''+cc.getDate()).padStart(2,'0');
	let day = yy+mm+dd;
	return day;
}

function getStatusText(status) {
	return settings.status[status] || 'None';
}

function getLeague(league) {
	let name = {
		'USAMLB':'BASEBALL',
		'USAMLS':'SOCCER',
		'USANBA':'BASKETBALL',
		'USANFL':'FOOTBALL',
		'USANHL':'HOCKEY',
		'ESPLIG':'LA LIGA',
		'ENGPRM':'PREMIER',
		'FRALIG':'LIGUE 1',
		'ITASER':'SERIE A',
		'GERBUN':'BUNDESLIGA',
		'CHNCSL':'SUPER LEAGUE',
		'TENATP':'ATP TENNIS',
		'TENWTA':'WTA TENNIS',
		'WRDCUP':'WORLD CUP',
	}[league]
	return name;
}

function calcOdds(t1, t2, t3, line=false) {
	let tt = t1+t2+t3;
	console.warn('odds',t1,t2,t3,tt);
	let odds1 = t1>0 ? parseInt(tt/t1*100) : 200;
	let odds2 = t2>0 ? parseInt(tt/t2*100) : 200;
	let odds3 = t3>0 ? parseInt(tt/t3*100) : 200;
	if(line){
		if(odds1>0 && odds1<200){ odds1 = -parseInt(20000/odds1); } else { odds1 = odds1 - 100; }
		if(odds2>0 && odds2<200){ odds2 = -parseInt(20000/odds2); } else { odds2 = odds2 - 100; }
		if(odds3>0 && odds3<200){ odds3 = -parseInt(20000/odds3); } else { odds3 = odds3 - 100; }
	}
	odds1 = Math.round(odds1/5)*5;
	odds2 = Math.round(odds2/5)*5;
	odds3 = Math.round(odds3/5)*5;
	//console.warn(odds1,odds2,odds3);
	return {odds1,odds2,odds3};
}

// get totals from sales, calcOdds
async function updateOdds(eid, opt, amt) {
	let res = await fetch('/api/salesbyevent/'+eid);
	let dat = await res.json();
	if(dat.error){ console.error('Error', dat); return; }
	console.log('Sales', dat);
	let row = $('event-'+eid);
	let lst = row.getElementsByClassName('team-odds');
	let ods = calcOdds(parseInt(dat.option1), parseInt(dat.option2), parseInt(dat.option3), true);
	lst[0].innerHTML = ods.odds1 || 100;
	//lst[1].innerHTML = ods.odds3; // TODO: only if sports allows draw
	lst[2].innerHTML = ods.odds2 || 100;
}

async function showCalendar(now, silent=false){
	// Month
	$('month').innerHTML = getMonthName(now);
	// Name
	$('dayx1').innerHTML = getDayName(now.addDays(-3));
	$('dayx2').innerHTML = getDayName(now.addDays(-2));
	$('dayx3').innerHTML = getDayName(now.addDays(-1));
	$('dayx4').innerHTML = getDayName(now);
	$('dayx5').innerHTML = getDayName(now.addDays(+1));
	$('dayx6').innerHTML = getDayName(now.addDays(+2));
	$('dayx7').innerHTML = getDayName(now.addDays(+3));
	// Number
	$('day1').innerHTML = getDayNumber(now.addDays(-3));
	$('day2').innerHTML = getDayNumber(now.addDays(-2));
	$('day3').innerHTML = getDayNumber(now.addDays(-1));
	$('day4').innerHTML = getDayNumber(now);
	$('day5').innerHTML = getDayNumber(now.addDays(+1));
	$('day6').innerHTML = getDayNumber(now.addDays(+2));
	$('day7').innerHTML = getDayNumber(now.addDays(+3));
	session.currentDate = now;
	//await loadEvents();
}

async function initCalendar() {
	let now = getNowLocal();
	//let hoy = new Date().toJSON().substr(0,10);
	//let now = new Date(hoy);
	dd = getDayName(now);
	nn = getDayNumber(now);
	console.log(now, dd, nn);
	//showCalendar(now);
	session.currentDate = now;
}

async function loadEvents(){
	console.log('Loading events...');
	let data, info;
	//let date = session.currentDate.toJSON().substr(0,10).replace(/-/g,'');
	//let date = getDate(session.currentDate);
	let date = session.currentDate.toJSON().substr(0,10);
	let url  = '/api/events/'+date;
	console.log('Url', url);
	try {
		data = await fetch(url);
		info = await data.json();
	} catch(ex) { 
		console.log('Error', ex);
		info = null;
	}
	console.log('Loaded Info', info);
	session.events = {};
	if(!info || Object.keys(info).length==0){ 
		console.log('No info'); 
	} else {
		for (var i = 0; i < info.length; i++) {
			session.events[info[i].eventid] = info[i];
		}
	}
	//listEvents();
}

function listEvents(){
	let info = session.events;
	console.log('List Info', info);
	let html = '';
	let rows = '';
	let row  = '';
	//var tmpTable = $('ui-list-events').innerHTML;
	var tmpTable = '<table class="list" id="list-{symbol}"><caption>{name}</caption><tbody>{rows}</tbody></table>';
	let tmpRow   = $('ui-row-event').innerHTML;
	let tmpEmpty = $('ui-row-noevents').innerHTML;
	if(info && Object.keys(info).length>0){ 
		let table  = '';
		let league = '';
		for (var eid in info) {
			let evt = info[eid];
			//console.log('League', evt.league);
            if(evt.league!==league){
              	if(league!==''){
            		table += '</tbody>';
            		table += '</table>';
            		html+=table;
               	}
				league = evt.league;
	    	    table  = `<table class="list" id="list-${league.toLowerCase()}">`;
                table += '<caption>'+getLeague(evt.league)+'</caption>';
        	    table += '<tbody>';
            }
			rows = '';
			let eventid = evt.eventid;
			let time    = getTime(evt.date);
			let team1   = evt.team1;
			let team2   = evt.team2;
			let name1   = evt.name1;
			let name2   = evt.name2;
			let icon1   = evt.icon1;
			let icon2   = evt.icon2;
			let status  = evt.status;
			let statux  = getStatusText(evt.status);
			let score1  = evt.score1;
			let score2  = evt.score2;
			//let team0   = leagues[league].teams[sym1];
			//let team1   = leagues[league].teams[sym2];
			let home    = (settings.home.indexOf(league)>=0 ? team1 : team2);
			let venue   = evt.venue || '&nbsp;';
			//let odds1   = evt.odds1 || 100;
			//let odds2   = evt.odds2 || 100;
			//let odds3   = evt.odds3 || 100;
			let odds    = calcOdds(parseInt(evt.option1), parseInt(evt.option2), parseInt(evt.option3), true);
	    	let	odds1   = odds.odds1 || 200;
			let	odds2   = odds.odds2 || 200;
			let	odds3   = odds.odds3 || 200;
			let notes   = evt.notes;
			let draw    = (settings.draw.indexOf(league)>=0);
			let link    = config.explorer+'/#/contract/'+config.bookid;
			if(status<2) {
				statux = time;
			}
			if(!draw){
				odds3 = '';
			}
			if(status==0) {
				score = 'VS';
			} else if(status==1) {
				score = draw?'DRAW':'VS';
			} else if(status=='2'){
				score = '0 - 0';
			} else if(status=='3'){
				lose1 = (score1<score2?'loser':'winner');
				lose2 = (score2<score1?'loser':'winner');
    			score = '<span class="big '+lose1+'">'+score1+'</span> - <span class="big '+lose2+'">'+score2+'</span>';
			} else {
				score = notes;
			}
			let okplay = status==1?'okplay':'noplay';
			let noplay = draw?'okplay':'noplay';
			console.log('-', league, eventid, team1, name1, 'vs', team2, name2, 'at', time);
			row = tmpRow.replace(/{eventid}/g, eventid)
						.replace(/{league}/g, league)
						.replace('{venue}', venue)
						.replace(/{leaguex}/g, league.toLowerCase())
						.replace(/{team1}/g,team1)
						.replace(/{team2}/g,team2)
						.replace('{name1}', name1)
						.replace('{name2}', name2)
						.replace('{icon1}', icon1)
						.replace('{icon2}', icon2)
						.replace('{status-class}', statux.toLowerCase())
						.replace('{status-text}', statux)
						.replace('{noplay}',noplay)
						.replace(/{okplay}/g,okplay)
						.replace('{score}', score)
						.replace('{odds1}', odds1)
						.replace('{odds2}', odds2)
						.replace('{odds3}', odds3)
						.replace('{link}',  link)
			//rows += row;
			table += row;
		}
		//table = table.replace('{rows}', rows);
   		table += '</tbody>';
        table += '</table>';
		html += table;
	} else {
		console.log('NO INFO'); 
		html = '<table class="list" id="list-none"><caption>Events</caption><tbody><td class="center">No events on this date</td></tr></tbody></table>';
	}
	$('all-lists').innerHTML = html;
}

async function loadTickets(){
	console.log('Loading tickets...');
	let data, info;
	let date = session.currentDate.toJSON().substr(0,10);
	let url  = '/api/tickets/date/'+date;
	console.log('Url', url);
	try {
		data = await fetch(url);
		info = await data.json();
	} catch(ex) { 
		console.log('Error', ex);
		info = null;
	}
	console.log('Loaded tickets', info);
	session.tickets = info;
	//if(!info || Object.keys(info).length==0){ 
	//	console.log('No info'); 
	//} else {
	//	for (var i = 0; i < info.length; i++) {
	//		session.tickets[info[i].ticketid] = info[i];
	//	}
	//}
}

async function listTickets(){
	console.log('Listing tickets...');
	$('tixs-title').innerHTML = 'Tickets sold on '+session.currentDate.toLocaleDateString([],{weekday: 'long'})+' '+session.currentDate.getDate();
	let tmp = $('ui-row-ticket').innerHTML;
	let htm = '';
	if(session.tickets.length>0){
		for (var i = 0; i < session.tickets.length; i++) {
			let tix = session.tickets[i];
			let	url = config.explorer + '/#/transaction/' + tix.trxid;
			let eid = tix.eventid;
			let tim = (new Date(tix.date)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
			let pk1 = tix.choice==1?'pick':'';
			let tm1 = tix.team1;
			let pk2 = tix.choice==2?'pick':'';
			let tm2 = tix.team2;
			let amt = tix.amount;
			let ply = tix.player.substr(0,8);
			let row = tmp.replace('{urltrx}', url)
						 .replace('{eventid}',eid)
						 .replace('{time}',   tim)
						 .replace('{pick1}',  pk1)
						 .replace('{team1}',  tm1)
						 .replace('{pick2}',  pk2)
						 .replace('{team2}',  tm2)
						 .replace('{amount}', amt)
						 .replace('{player}', ply)
			htm += row;
		}
		$('list-tickets').tBodies[0].innerHTML = htm;
	} else {
		$('list-tickets').tBodies[0].innerHTML = '<tr><td>&nbsp;</td><td class="center">No tickets sold on this date</td></tr>';
	}
}

async function onDay(num) {
	console.log('Date', session.currentDate, num);
	switch(num){ 
		case 1: days = -3; break;
		case 2: days = -2; break;
		case 3: days = -1; break;
		case 4: days =  0; break;
		case 5: days = +1; break;
		case 6: days = +2; break;
		case 7: days = +3; break;
	}
	//let hoy  = new Date().toJSON().substr(0,10);
	let hoy  = getNowLocal();
	let now  = (days==0 ? new Date(hoy) : new Date(session.currentDate));
	let date = new Date(now.setDate(now.getDate() + days));
	let day  = getDate(date);
	await showCalendar(date);
	await loadEvents();
	await listEvents();
	await loadTickets();
	await listTickets();
}

async function initEvents() {
	initCalendar();
	await loadEvents();
	await listEvents();
}

// END