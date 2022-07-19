// get mlb scores
let db = require('./database.js');
let fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

let TronWeb = require('tronweb');
const tronweb = new TronWeb({
    fullHost: 'https://api.shasta.trongrid.io',
    privateKey: process.env.ADMINKEY
});

let teams = {
	108: { sym:'LAA', name:'Angels' },
	109: { sym:'ARI', name:'Diamondbacks' },
	110: { sym:'BAL', name:'Orioles' },
	111: { sym:'BOS', name:'Red Sox' },
	112: { sym:'CHC', name:'Cubs' },
	113: { sym:'CIN', name:'Reds' },
	114: { sym:'CLE', name:'Guardians' },
	115: { sym:'COL', name:'Rockies' },
	116: { sym:'DET', name:'Tigers' },
	117: { sym:'HOU', name:'Astros' },
	118: { sym:'KC' , name:'Royals' },
	119: { sym:'LAD', name:'Dodgers' },
	120: { sym:'WSH', name:'Nationals' },
	121: { sym:'NYM', name:'Mets' },
	133: { sym:'OAK', name:'Athletics' },
	134: { sym:'PIT', name:'Pirates' },
	135: { sym:'SD' , name:'Padres' },
	136: { sym:'SEA', name:'Mariners' },
	137: { sym:'SF' , name:'Giants' },
	138: { sym:'STL', name:'Cardinals' },
	139: { sym:'TB' , name:'Rays' },
	140: { sym:'TEX', name:'Rangers' },
	141: { sym:'TOR', name:'Blue Jays' },
	142: { sym:'MIN', name:'Twins' },
	143: { sym:'PHI', name:'Phillies' },
	144: { sym:'ATL', name:'Braves' },
	145: { sym:'CWS', name:'White Sox' },
	146: { sym:'MIA', name:'Marlins' },
	147: { sym:'NYY', name:'Yankees' },
	158: { sym:'MIL', name:'Brewers' }
}

let statusCodes = {'F':'Final', 'S':'Scheduled', 'DR':'Postponed'};

function pad(n,s){ return n.toString().padEnd(s); }
function pads(n,s){ return n.toString().padStart(s); }
function time(d){ return new Date(d).toJSON().substr(11,5); }


async function mlbScores(edt) {
	let skip = false;
	if(!edt){ edt = new Date(); skip = true; }
	let adr = process.env.BOOKID;
	let lge = 'USAMLB';
	let hoy = new Date(edt.toJSON().substr(0,10));
	let ytd = edt.toJSON().substr(0,10);
	if(skip){ ytd = new Date(hoy.setDate(hoy.getDate() - 1)).toJSON().substr(0,10); }
	let day = new Date(ytd).getTime()/1000;
	console.warn('-- MLB scores on', ytd, day);

	let bal = await tronweb.trx.getAccount('TVMHHvhVD92Qm7uwpnhSDetQpKrjjM7zGW');
	console.warn('BAL', bal.balance/1000000, bal.balance);
	if(bal.balance<1000000000){ console.warn('Insufficient balance, please replenish'); return; }
	let lst = await db.eventsByDay(day);
	// console.warn(lst);
	console.warn('CTR', adr);
	let ctr = await tronweb.contract().at(adr);
	let url = 'http://statsapi.mlb.com/api/v1/schedule/games/?sportId=1&startDate='+ytd+'&endDate='+ytd;
	let inf = await fetch(url);
	let jsn = await inf.json();
	//console.warn(jsn);
	let dat = jsn.dates[0];
	let dte = dat.date;
	let cnt = dat.totalGames;
	let gms = dat.games;
	for (var i = 0; i < gms.length; i++) {
		let gam = gms[i];
		let tim = new Date(gam.gameDate);
		let tix = tim.toJSON().substr(11,5);
		let now = new Date(tim.getTime()-4*60*60*1000).toJSON().substr(11,5);
		let id1 = gam.teams.away.team.id;
		let tm1 = teams[id1].sym;
		let tx1 = tm1.padEnd(3);
		let nm1 = teams[id1].name;
		let nx1 = gam.teams.away.team.name;
		let sc1 = gam.teams.away.score || 0;
		let id2 = gam.teams.home.team.id;
		let tm2 = teams[id2].sym;
		let tx2 = tm2.padEnd(3);
		let nm2 = teams[id2].name;
		let nx2 = gam.teams.home.team.name;
		let sc2 = gam.teams.home.score || 0;
		let sta = gam.status.statusCode;
		let rsn = gam.status.reason || '';
		//console.warn(now, tx1, 'vs', tx2, sc1, sc2, sta, rsn);
		// Get event id
		let eid = 0;
		for (var j = 0; j < lst.length; j++) {
			itm = lst[j];
			let ddd = new Date(itm.date).toJSON().substr(11,5);
			if(ddd==tix && itm.team1==tm1 && itm.team2==tm2){
				eid = itm.eventid;
				//console.warn('Event', itm.eventid);
			}
		}
		if(eid<1){ 
			console.warn('Event id not found', tix, pad(tm1,3), pad(tm2,3));
			continue; 
		}
		if(sta=='F'){
			let win = sc1>sc2?1:(sc2>sc1?2:3);
			console.warn(eid, time(tim), pad(tm1,3), pad(tm2,3), pads(sc1,2), pads(sc2,2), pads(win,2), sta);
			// Update contract
			let trx = await ctr.finishEvent(eid, sc1, sc2, win).send({
			    feeLimit: 100000000
			});
			//console.warn('TRX', trx);
			// Update db local
			let res = await db.finalEvent(eid, sc1, sc2, win);
			if(res.error){ console.warn('DBX', res); }
		} else if(sta=='DR'){
			console.warn(eid, time(tim), pad(tm1,3), pad(tm2,3), pads(sc1,2), pads(sc2,2), ' 0', sta, 'PPD', rsn);
			// Update contract
			let trx = await ctr.cancelEvent(eid).send({
			    feeLimit: 100000000
			});
			//console.warn('TRX', trx);
			// Update db local
			let res = await db.cancelEvent(eid, rsn);
			if(res.error){ console.warn('DBX', res); }
		} else {
			console.warn('Status undefined', sta);
		}
	}
   	console.warn('Scores updated');
}

async function mlbEvents(edt) {
	let skip = false;
	if(!edt){ edt = new Date(); skip = true; }
	let adr = process.env.BOOKID;
	let lge = 'USAMLB';
	let now = new Date(edt.toJSON().substr(0,10));
	let tmr = edt.toJSON().substr(0,10);
	if(skip){ tmr = new Date(now.setDate(now.getDate() + 3)).toJSON().substr(0,10); }
	let day = new Date(tmr).getTime()/1000;
	console.warn('-- MLB events on', tmr, day);
	let statusCodes = {'F':'Final', 'S':'Scheduled', 'DR':'Postponed'};
	try {
		let bal = await tronweb.trx.getAccount('TVMHHvhVD92Qm7uwpnhSDetQpKrjjM7zGW');
		console.warn('BAL', bal.balance/1000000, bal.balance);
		if(bal.balance<1000000000){ console.warn('Insufficient balance, please replenish'); return; }
		// Get events
		let ctr = await tronweb.contract().at(adr);
		let res = await ctr.nextevent().call();
		let eid = parseInt(res.toString());
		let url = 'http://statsapi.mlb.com/api/v1/schedule/games/?sportId=1&startDate='+tmr+'&endDate='+tmr;
		let inf = await fetch(url);
		let jsn = await inf.json();
		//console.warn(jsn);
		if(jsn.dates.length<1){ console.warn('NO EVENTS ON THIS DATE'); return; }
		let dat = jsn.dates[0];
		let dte = dat.date;
		let cnt = dat.totalGames;
		let games = dat.games;
		for (var i = 0; i < games.length; i++) {
			let gam = games[i];
			let tim = new Date(gam.gameDate);
			let ini = tim.getTime()/1000;
			let id1 = gam.teams.away.team.id;
			if(!teams[id1]){ console.warn('TEAM NOT FOUND', id1); continue; }
			let tm1 = teams[id1].sym;
			let id2 = gam.teams.home.team.id;
			if(!teams[id2]){ console.warn('TEAM NOT FOUND', id2); continue; }
			let tm2 = teams[id2].sym;
			let sta = gam.status.statusCode;
			// save to contract
			let trx = await ctr.newEvent(day,ini,lge,tm1,tm2).send({
			    feeLimit: 100000000
			});
			//console.warn('TRX', trx);
			// save to db
			eid += 1;
			let rex = await db.newEvent({eventid:eid, day:day, date:tim, league:lge, team1:tm1, team2:tm2, status:1});
			if(rex.status=='OK'){
				console.warn(eid, time(tim), pad(tm1,3), pad(tm2,3), '-', rex.status, rex.id);
			} else {
				console.warn(eid, time(tim), pad(tm1,3), pad(tm2,3), '- ERROR');
				console.warn(rex);
			}
		}
	} catch(ex) {
		console.error('ERROR:', ex);
	}
   	console.warn('Events updated');
}

module.exports = {
	mlbScores,
	mlbEvents
};

// END