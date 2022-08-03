// TRON hackathon

const fs           = require('fs');
const path         = require('path');
//const fetch        = require('node-fetch');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const ejs          = require('ejs');
const express      = require('express');
//const bodyParser   = require('body-parser');
const cookieParser = require('cookie-parser');
const api          = require('./api.js');
//const bots         = require('./bots.js');
const cron         = require('./cron.js');
const db           = require('./database.js');


var config = {
    bookid:   process.env.BOOKID,
    explorer: process.env.TRONSCAN,
    network:  process.env.NETWORK,
    neturl:   process.env.TRONGRID,
    operator: process.env.ADMINPUB,
    theme:    'dark-mode'
};

function hit(req,txt=''){ console.warn(new Date().toJSON().substr(11,8), req.path, txt); }

async function main(){
    console.warn(new Date(), 'GU3SS is running on', process.env.NETWORK);
    const app = express();
    app.use(express.static(path.join(__dirname, 'public')));
    app.use(express.json()) // Instead of bodyParser since express 4.16
    app.use(cookieParser());
    app.set('views', path.join(__dirname, 'public/views'));
    app.set('view engine', 'html');
    app.engine('html', ejs.renderFile);


    //---- ROUTER

    app.get('/', async (req, res) => { 
        try {
            res.render('index.html', {config});
        } catch(ex) {
            console.error(new Date(), 'Server error', ex.message);
            return res.status(500).end('500 - Server error');
        }
    });
    
    app.get('/play', async (req, res) => { 
        let day = new Date().toJSON().substr(0,10);
        let now = parseInt((new Date(day)).getTime()/1000);
        hit(req, day+' '+now);
        let list = [];
        let tixs = await db.ticketsByDate(day);
        res.render('play.html', {config, list, tixs});
    });

    app.get('/leaders', async (req, res) => { 
        hit(req);
        res.render('leaders.html', {config});
    });

    app.get('/mytickets', async (req, res) => { 
        hit(req);
        let list = [];
        config.user = req.cookies.address;
        if(config.user){
            list = await db.ticketsByPlayer(config.user, 100);
        }
        res.render('mytickets.html', {config, list});
    });

    app.get('/sales', async (req, res) => { 
        hit(req);
        config.user = req.cookies.address;
        let now  = new Date().toJSON().substr(0,10);
        let day  = parseInt((new Date(now)).getTime()/1000);
        let list = await db.salesByDay(day);
        res.render('sales.html', {config, list});
    });

    app.get('/faq', async (req, res) => { 
        hit(req);
        res.render('faq.html', {config});
    });


    // API

    app.get('/api/getevent/:eid', async (req, res) => {
        hit(req);
        let data = await db.getEvent(req.params.eid);
        res.send(JSON.stringify(data));
    });

    app.get('/api/events/:date', async (req, res) => { 
        hit(req);
        let date = req.params.date;
        let day  = new Date(date).getTime()/1000;
        let data = await db.eventsByDay(day);
        res.send(JSON.stringify(data));
    });

    app.post('/api/uploadevents/:date', async (req, res) => { 
        hit(req);
        let date = req.params.date;
        let data = req.body;
        console.warn(data.length, 'events received');
        let rex = await api.uploadEvents(data);
        console.warn('REX', rex);
        res.send(JSON.stringify(rex));
    });

    app.get('/api/update/:msg/:eid', async (req, res) => { 
        hit(req);
        let msg = req.params.msg;
        let eid = req.params.eid;
        let rex = await api.updateData(msg, eid);
        res.send('{"status":"OK"}');
    });

    app.get('/api/newevents/:nini/:nend', async (req, res) => { 
        hit(req);
        let nini = parseInt(req.params.nini);
        let nend = parseInt(req.params.nend);
        let ids  = [];
        for (var i = nini; i <= nend; i++) { ids.push(i); }
        let rex = await api.updateData('events', ids);
        res.send('{"status":"OK"}');
    });

    app.get('/api/scores/:date', async (req, res) => { 
        hit(req);
        let day = new Date(req.params.date).getTime()/1000;
        let lst = await db.eventIdsByDay(day);
        let arr = lst.map(rec=>{return rec.eventid});
        let ids = arr.join(':');
        let rex = await api.updateData('scores', ids);
        res.send('{"status":"OK"}');
    });

    app.get('/api/tickets/date/:date', async (req, res) => { 
        hit(req);
        let data = await db.ticketsByDate(req.params.date);
        res.send(JSON.stringify(data));
    });

    app.get('/api/tickets/event/:eid', async (req, res) => { 
        hit(req);
        let data = await db.ticketsByEvent(req.params.eid);
        res.send(JSON.stringify(data));
    });

    app.get('/api/tickets/player/:adr', async (req, res) => { 
        hit(req);
        let data = await db.ticketsByPlayer(req.params.adr);
        res.send(JSON.stringify(data));
    });

    app.get('/api/tickets/pending', async (req, res) => {
        hit(req);
        let player = req.cookies.address;
        console.warn('Pending', player);
        if(!player){
            res.send(JSON.stringify({error:'Player address not valid'}));
            return;
        }
        let rex = await api.ticketsPending(player);
        res.send(JSON.stringify(rex));
    });

    app.get('/api/tickets/allpending', async (req, res) => {
        hit(req);
        let rex = await db.allTicketsPending();
        res.send(JSON.stringify(rex));
    });

    app.post('/api/newticket', async (req, res) => { 
        let data = req.body;
        console.warn('/api/newticket', data);
        let rex = await db.newTicket(data);
        console.warn('New ticket', rex);
        res.send(JSON.stringify(rex));
    });

    app.get('/api/salesbyevent/:eventid', async (req, res) => { 
        hit(req);
        let rex = await db.salesByEventId(req.params.eventid);
        res.send(JSON.stringify(rex));
    });

    app.get('/api/sales/:date', async (req, res) => { 
        hit(req);
        let day = parseInt((new Date(req.params.date)).getTime()/1000);
        let lst = await db.salesByDay(day);
        res.send(JSON.stringify(lst));
    });

    app.get('/api/cashout/:trxid/:receipt', async (req, res) => {
        hit(req, req.cookies.address);
        let rex = await api.ticketCashout(req.params.trxid, req.params.receipt, req.cookies.address);
        res.send(JSON.stringify(rex));
    });

    app.get('/api/refund/:trxid/:receipt', async (req, res) => {
        hit(req, req.cookies.address);
        let rex = await api.ticketRefund(req.params.trxid, req.params.receipt, req.cookies.address);
        res.send(JSON.stringify(rex));
    });

    app.get('/cron/mlbscores', async (req, res) => { 
        hit(req);
        cron.mlbScores();
        res.send("OK");
    });

    app.get('/cron/mlbscores/:date', async (req, res) => { 
        hit(req);
        cron.mlbScores(new Date(req.params.date));
        res.send("OK");
    });

    app.get('/cron/mlbevents', async (req, res) => { 
        hit(req);
        cron.mlbEvents();
        res.send("OK");
    });

    app.get('/cron/mlbevents/:date', async (req, res) => { 
        hit(req);
        cron.mlbEvents(new Date(req.params.date));
        res.send("OK");
    });

    app.get('/api/*', (req, res) => { 
        hit(req, '404 - API resource not found');
        res.status(404).end(`{"error":"Resource not found", "path":"${req.path}"}`); // Catch all
    });

    app.get('*', (req, res) => { 
        hit(req, '404 - Resource not found');
        res.status(404).render('notfound.html', {config:config}); // Catch all
    });

    app.listen(5000);
}

main();

// END