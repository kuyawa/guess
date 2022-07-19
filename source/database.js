// DATABASE

const postgres = require('pg');
const dbconn   = process.env.DATABASE;
if(!dbconn){ console.error('DATASERVER NOT AVAILABLE'); }
const dbp = new postgres.Pool({ connectionString: dbconn });


class DataServer {
    async connect() {}
    async disconnect() {}

    async insert(sql, params, key) {
        var dbc, res, recid, data = null;
        try {
            dbc = await dbp.connect();
            res = await dbc.query(sql, params);
            if(res.rowCount>0) { 
                recid = key?res.rows[0][key]:0;
                data  = { status:'OK', id: recid }; 
            }
        } catch(ex) {
            console.error('DB error on new record:', ex.message);
            data = { error: ex.message };
        } finally {
            if (dbc) { dbc.release(); }
        }
        return data;
    }

    async update(sql, params) {
        var dbc, res, data = null;
        try {
            dbc = await dbp.connect();
            res = await dbc.query(sql, params);
            if(res.rowCount>0) {
                data = res.rowCount;
            } else { 
                data = 0;
            }
        } catch(ex) {
            console.error('DB error updating records:', ex.message);
            data = { error: ex.message };
        } finally {
            if (dbc) { dbc.release(); }
        }
        return data;
    }

    async query(sql, params) {
        var dbc, res, data = null;
        try {
            dbc = await dbp.connect();
            res = await dbc.query(sql, params);
            if(res.rows.length>0) { 
                data = res.rows;
            } else {
                data = [];
            }
        } catch(ex) {
            console.error('DB error in query:', ex.message);
            data = { error: ex.message };
        } finally {
            if (dbc) { dbc.release(); }
        }
        return data;
    }

    async queryObject(sql, params) {
        var dbc, res, data = null;
        try {
            dbc = await dbp.connect();
            res = await dbc.query(sql, params);
            if(res.rows.length>0) { 
                data = res.rows[0];
            }
        } catch(ex) {
            console.error('DB error getting data object:', ex.message);
            data = { error: ex.message };
        } finally {
            if (dbc) { dbc.release(); }
        }
        return data;
    }

    async queryValue(sql, params) {
        var dbc, res, data = null;
        try {
            dbc = await dbp.connect();
            res = await dbc.query(sql, params);
            if(res.rows.length>0) { 
                data = res.rows[0].value; // Select should have field as value
            }
        } catch(ex) {
            console.error('DB error getting data value:', ex.message);
            data = { error: ex.message };
        } finally {
            if (dbc) { dbc.release(); }
        }
        return data;
    }
}


const DS = new DataServer();

async function newEvent(rec) {
	let sql1 = 'insert into events(eventid, day, date, league, team1, team2, status) values($1, $2, $3, $4, $5, $6, $7) returning eventid';
    let sql2 = 'insert into sales(eventid) values($1) returning salesid';
    let par1 = [rec.eventid, rec.day, rec.date, rec.league, rec.team1, rec.team2, rec.status];
    let par2 = [rec.eventid];
    let dat1 = await DS.insert(sql1, par1, 'eventid');
    let dat2 = await DS.insert(sql2, par2, 'salesid');
    return dat1;
}

async function getEvent(eid) {
	let sql  = 'select * from events where eventid=$1';
    let pars = [eid];
    let data = await DS.queryObject(sql, pars);
    return data;
}

async function closeEvent(eid) {
    let sql  = 'update events set status=2 where eventid=$1';
    let pars = [eid];
    let data = await DS.update(sql, pars);
    return data;
}

async function cancelEvent(eid, notes) {
    let sql  = 'update events set status=4, notes=$1 where eventid=$2';
    let pars = [notes, eid];
    let data = await DS.update(sql, pars);
    return data;
}

async function finalEvent(eid, score1, score2, winner) {
    let sql1 = 'update events set status=3, score1=$1, score2=$2, winner=$3 where eventid=$4';
    let par1 = [score1, score2, winner, eid];
    let res1 = await DS.update(sql1, par1);
    let sql2 = 'update tickets set winner=true where eventid=$1 and choice=$2';
    let par2 = [eid, winner];
    let res2 = await DS.update(sql2, par2);
    let sql3 = 'update sales set fees = total * 0.1 where eventid=$1';
    let par3 = [eid];
    let res3 = await DS.update(sql3, par3);
    return {res1, res2, res3};
}

async function eventsByDay(day) {
	//let sql  = 'select * from events where day=$1 order by league, date';
    let sql  = 'SELECT e.*, t1.name as name1, t1.icon as icon1, t1.venue as venue1, t2.name as name2, t2.icon as icon2, t2.venue as venue2, s.option1, s.option2, s.option3'+
               '  FROM events e'+
               '  LEFT JOIN teams t1 ON e.league = t1.league AND e.team1 = t1.team'+
               '  LEFT JOIN teams t2 ON e.league = t2.league AND e.team2 = t2.team'+
               '  LEFT JOIN sales s  ON e.eventid = s.eventid'+
               ' WHERE day = $1'+
               ' ORDER BY league, date';
    let pars = [day];
    let data = await DS.query(sql, pars);
    return data;
}

async function eventIdsByDay(day) {
    let sql  = 'select eventid from events where day=$1 order by eventid';
    let pars = [day];
    let data = await DS.query(sql, pars);
    return data;
}

async function newTicket(rec) {
    let data = {ok:false};
    try {
    	let sql = 'insert into tickets(eventid, player, amount, choice, trxid) values($1, $2, $3, $4, $5) returning ticketid';
        let pars = [rec.eventid, rec.player, rec.amount, rec.choice, rec.trxid];
            data = await DS.insert(sql, pars, 'ticketid');
        let pick = parseInt(rec.choice);
        let sqlx = null;
        let parx = [rec.amount, rec.eventid];
        switch(pick){
            case 1: sqlx = 'update sales set count1=count1+1, option1=option1+$1, total=total+$1 where eventid=$2'; break;
            case 2: sqlx = 'update sales set count2=count2+1, option2=option2+$1, total=total+$1 where eventid=$2'; break;
            case 3: sqlx = 'update sales set count3=count3+1, option3=option3+$1, total=total+$1 where eventid=$2'; break;
        }
        if(sqlx) { let datx = await DS.update(sqlx, parx); }
    } catch(ex) {
        console.error('DBERR', ex);
        data = {ok:false, error:ex.message};
    }
    return data;
}

async function getTicket(tid) {
	let sql  = 'select * from tickets where ticketid=$1';
    let pars = [tid];
    let data = await DS.queryObject(sql, pars);
    return data;
}

async function ticketsByDate(date) {
	//let sql  = "select * from tickets where date_trunc('day',date) = $1 order by date desc"; // 'day' must be in apostrophes
    let sql  = "SELECT t.*, e.team1, e.team2, e.score1, e.score2, e.day as eday, e.date as edate, e.status as estatus, e.winner as ewinner FROM tickets t LEFT JOIN events e ON t.eventid=e.eventid WHERE date_trunc('day',e.date) = $1 ORDER by t.date desc LIMIT 20";
    let pars = [date];
    let data = await DS.query(sql, pars);
    return data;
}

async function ticketsByEvent(eid) {
    let sql  = 'select * from tickets where eventid=$1 order by date desc';
    let pars = [eid];
    let data = await DS.query(sql, pars);
    return data;
}

async function ticketsByPlayer(adr, limit=100) {
	let sql  = 'SELECT t.*, e.team1, e.team2, e.score1, e.score2, e.day as eday, e.date as edate, e.status as estatus, e.winner as ewinner FROM tickets t LEFT JOIN events e ON t.eventid=e.eventid WHERE t.player=$1 ORDER by edate desc LIMIT $2';
    let pars = [adr, limit];
    let data = await DS.query(sql, pars);
    return data;
}

async function ticketCashout(trx, rcp) {
    let sql  = 'UPDATE tickets SET status=1, payid=$1, payday=now() WHERE trxid=$2';
    let pars = [rcp, trx];
    let data = await DS.update(sql, pars);
    return data;
}

async function ticketRefund(trx, rcp) {
    let sql  = 'UPDATE tickets SET status=1, payid=$1, payday=now() WHERE trxid=$2';
    let pars = [rcp, trx];
    let data = await DS.update(sql, pars);
    return data;
}

// Already paid in contract but DB not updated as TX takes time to confirm
async function ticketsPending(player) {
    let sql  = 'SELECT * FROM tickets WHERE player=$1 AND payid IS NOT NULL AND winnings=0 ORDER BY payday';
    let pars = [player];
    let data = await DS.query(sql, pars);
    return data;
}

async function allTicketsPending() {
    let sql  = 'SELECT * FROM tickets WHERE winner=true AND status=0 ORDER BY date';
    let data = await DS.query(sql);
    return data;
}

async function ticketPayment(tid, amt) {
    let sql  = 'UPDATE tickets SET winnings=$1 WHERE tid=$2';
    let pars = [amt, tid];
    let data = await DS.update(sql, pars);
    return data;
}

async function leaderboard() {
    let sql  = 'select sum(winnings) as won, player from tickets where winner=true group by player order by won desc limit 20';
    let pars = [];
    let data = await DS.query(sql);
    return data;
}

async function salesByEvent() {
    let sql  = 'SELECT s.*, e.day, e.team1, e.team2'+
               '  FROM sales s'+
               '  LEFT JOIN events e ON s.eventid=e.eventid'+
               '  ORDER BY s.eventid DESC'+
               '  LIMIT 100';
    let data = await DS.query(sql);
    return data;
}

async function salesByEventId(eid) {
    let sql  = 'SELECT s.*, e.day, e.team1, e.team2'+
               '  FROM sales s'+
               '  LEFT JOIN events e ON s.eventid=e.eventid'+
               '  WHERE s.eventid = $1'
    let pars = [eid];
    let data = await DS.queryObject(sql,pars);
    return data;
}

async function salesByDay(day) {
    let sql  = 'SELECT e.day, e.team1, e.team2, s.*'+
               '  FROM events e'+
               '  LEFT JOIN sales s ON s.eventid=e.eventid'+
               ' WHERE e.day = $1'+
               ' ORDER BY eventid';
    let pars = [day];
    let data = await DS.query(sql, pars);
    return data;
}


module.exports = {
	newEvent,
	getEvent,
	closeEvent,
    cancelEvent,
    finalEvent,
	eventsByDay,
    eventIdsByDay,
	newTicket,
	getTicket,
    ticketsByDate,
	ticketsByEvent,
	ticketsByPlayer,
    ticketsPending,
    allTicketsPending,
    ticketCashout,
    ticketRefund,
    ticketPayment,
    leaderboard,
    salesByEvent,
    salesByEventId,
    salesByDay
}

// END