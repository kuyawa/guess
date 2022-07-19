// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.7.6;
pragma experimental ABIEncoderV2;


contract Sportsbook {


//- LOGS

    event logEvent(uint indexed day, uint indexed start, uint indexed eventid, uint stamp, string league, string team1, string team2);
    event logTicket(uint indexed ticketid, uint indexed eventid, address indexed player, uint stamp, uint amount, uint8 choice);
    event logClose(uint indexed eventid, uint stamp);
    event logFinish(uint indexed eventid, uint stamp, uint8 score1, uint8 score2, uint8 winner);
    event logCancel(uint indexed eventid, uint stamp);
    event logPayout(uint indexed eventid, address indexed player, uint stamp, uint ticketid, uint amount, uint8 choice);
    event logRefund(uint indexed eventid, address indexed player, uint stamp, uint ticketid, uint amount);
    event logInvalid(uint indexed eventid, address indexed player, uint stamp, uint amount);


//- VARS

    address internal operator;
    address payable internal treasury;
    uint public nextevent  = 0;
    uint public nextticket = 0;
    uint FEES   = 10;        // 10%
    uint MINBET = 1000000;   // 1 TRX

    struct Events {
        uint   eventid;   // serial 0001
        uint   day;       // event day  2022-05-28
        uint   start;     // event date 2022-05-28 14:00
        uint8  score1;    // 3
        uint8  score2;    // 5
        uint8  winner;    // 0.none 1.team1 2.team2  3.tie      4.postponed
        uint8  status;    // 0.none 1.open  2.closed 3.finished 4.postponed
        string league;    // MLB LIG PRM
        string team1;     // NYY
        string team2;     // NYM
    }

    struct Ticket {
        uint    ticketid; // serial 0001
        uint    eventid;  // event id 0001
        uint    date;     // time of purchase
        address player;   // wallet address
        uint    amount;   // 100 TRX
        uint8   choice;   // 1.team1 2.team2 3.tie
        uint    odds;     // moneyline
        bool    winner;   // true false
        uint    winnings; // payment
        uint8   status;   // 0.none 1.cashed 2.invalid
    }

    struct Sales {
        uint eventid;     // 0001
        uint opt1;        // bets for opt1
        uint opt2;        // bets for opt2
        uint opt3;        // bets for opt3
        uint total;       // total bets
        uint fees;        // total fees
        uint paid;        // total paid
    }

    mapping(uint => Events) eventsbyid;   // 0001=>Event
    mapping(uint => Ticket) ticketsbyid;  // 0001=>Ticket
    mapping(uint => Sales)  salesbyid;    // 0001=>Sales


//- MODS

    bool private mutex; // reentry check

    modifier admin() {
        require(msg.sender==operator, 'ERR_UNAUTHORIZED');
        _;
    }

    modifier lock() {
        require(!mutex, "ERR_INVALIDREENTRY");
        mutex = true;
        _;
        mutex = false;
    }

    modifier vlock() {
        require(!mutex, "ERR_INVALIDREENTRY");
        _;
    }


//- MAIN

    constructor() {
        operator = msg.sender;
        treasury = payable(msg.sender);
    }

    function newEvent(uint day, uint start, string memory league, string memory team1, string memory team2) external lock admin {
        nextevent = nextevent + 1;
        uint eventid   = nextevent;
        Events storage events = eventsbyid[eventid];
        events.eventid = eventid;
        events.day     = day;
        events.start   = start;
        events.league  = league;
        events.team1   = team1;
        events.team2   = team2;
        events.score1  = 0;
        events.score2  = 0;
        events.winner  = 0;
        events.status  = 1; // open
        eventsbyid[eventid] = events;
        Sales storage sales = salesbyid[eventid];
        sales.eventid = eventid;
        sales.total = 0;
        sales.opt1  = 0;
        sales.opt2  = 0;
        sales.opt3  = 0;
        sales.fees  = 0;
        sales.paid  = 0;
        emit logEvent(day, start, eventid, block.timestamp, league, team1, team2);
    }

    function newTicket(uint eventid, uint8 choice) external payable lock {
        // sender bets amount to outcome
        address player = msg.sender;
        uint amount    = msg.value;
        // check event is still open
        Events storage events = eventsbyid[eventid];
        require(choice>0 && choice<4, "ERR_INVALIDCHOICE");
        require(events.eventid>0, "ERR_EVENTNOTFOUND");
        require(events.status==1, "ERR_EVENTNOTOPEN");
        require(amount >= MINBET, "ERR_MINIMUMBET"); // Check min bet
        if(events.start < block.timestamp){
            events.status = 2; // auto close event and log for refund
            emit logInvalid(eventid, player, block.timestamp, amount);
            return;
        }
        nextticket      = nextticket + 1;
        uint ticketid   = nextticket;
        Ticket storage ticket = ticketsbyid[ticketid];
        ticket.ticketid = ticketid;
        ticket.eventid  = eventid;
        ticket.date     = block.timestamp;
        ticket.player   = player;
        ticket.amount   = amount;
        ticket.choice   = choice;
        ticket.odds     = 0;
        ticket.winner   = false;
        ticket.winnings = 0;
        ticket.status   = 0;
        ticketsbyid[ticketid] = ticket;
        Sales storage sales = salesbyid[eventid];
        sales.total += amount;
        if     (choice==1){ sales.opt1 += amount; }
        else if(choice==2){ sales.opt2 += amount; }
        else if(choice==3){ sales.opt3 += amount; }
        emit logTicket(ticketid, eventid, player, block.timestamp, amount, choice);
    }

    function getEventById(uint eventid) public view returns(Events memory){
        Events storage events = eventsbyid[eventid];
        return events;
    }

    function getTicketById(uint ticketid) public view returns(Ticket memory){
        Ticket storage ticket = ticketsbyid[ticketid];
        return ticket;
    }

    function getSalesById(uint eventid) public view returns(Sales memory){
        Sales storage sales = salesbyid[eventid];
        return sales;
    }

    function closeEvent(uint eventid) external lock admin {
        Events storage events = eventsbyid[eventid];
        require(events.eventid>0, "ERR_EVENTNOTFOUND");
        events.status = 2;  // closed, no more bets
        emit logClose(eventid, block.timestamp);
    }

    function finishEvent(uint eventid, uint8 score1, uint8 score2, uint8 winner) external lock admin {
        Events storage events = eventsbyid[eventid];
        require(events.eventid>0, "ERR_EVENTNOTFOUND");
        events.score1 = score1;
        events.score2 = score2;
        events.winner = winner;
        events.status = 3;
        // Calc fees and get them
        Sales storage sales = salesbyid[eventid];
        uint fees  = sales.total * FEES / 100;
        sales.fees = fees;
        sales.paid = 0;
        treasury.transfer(fees);
        emit logFinish(eventid, block.timestamp, score1, score2, winner);
    }

    function cancelEvent(uint eventid) external lock admin {
        Events storage events = eventsbyid[eventid];
        require(events.eventid>0, "ERR_EVENTNOTFOUND");
        events.status = 4;  // postponed/cancelled
        emit logCancel(eventid, block.timestamp);
    }

    function payout(uint ticketid) external lock {
        // check sender address, verify ticket only if event has finished
        address payable player = msg.sender;
        Ticket storage ticket = ticketsbyid[ticketid];
        require(ticket.ticketid>0, "ERR_TICKETNOTFOUND");
        require(ticket.eventid>0, "ERR_INVALIDEVENT");
        require(ticket.player==player, "ERR_INVALIDPLAYER");
        require(ticket.status==0, "ERR_ALREADYPAID");
        Events memory events = eventsbyid[ticket.eventid];
        require(events.eventid>0, "ERR_EVENTNOTFOUND");
        require(events.status==3, "ERR_EVENTNOTFINISHED");
        require(ticket.choice==events.winner, "ERR_NOTWINNER");
        // calculate winnings
        Sales storage sales = salesbyid[ticket.eventid];
        uint pool = (sales.total-sales.fees);
        uint bets = 0;
        if     (ticket.choice==1){ bets = sales.opt1; }
        else if(ticket.choice==2){ bets = sales.opt2; }
        else if(ticket.choice==3){ bets = sales.opt3; }
        uint wins = ticket.amount * pool / bets;
        ticket.status   = 1;
        ticket.winner   = true;
        ticket.winnings = wins;
        sales.paid += wins;
        player.transfer(wins);
        emit logPayout(ticket.eventid, msg.sender, block.timestamp, ticketid, wins, ticket.choice);
    }

    function refund(uint ticketid) external lock {
        // check sender address, verify ticket only if event was cancelled
        address payable player = msg.sender;
        Ticket storage ticket = ticketsbyid[ticketid];
        require(ticket.ticketid>0, "ERR_TICKETNOTFOUND");
        require(ticket.eventid>0, "ERR_INVALIDEVENT");
        require(ticket.player==player, "ERR_INVALIDPLAYER");
        require(ticket.status==0, "ERR_ALREADYPAID");
        Events memory events = eventsbyid[ticket.eventid];
        require(events.eventid>0, "ERR_EVENTNOTFOUND");
        require(events.status==4, "ERR_EVENTNOTCANCELLED");
        // refund ticket amount
        Sales storage sales = salesbyid[ticket.eventid];
        sales.paid += ticket.amount;
        ticket.status = 1;
        player.transfer(ticket.amount);
        emit logRefund(ticket.eventid, msg.sender, block.timestamp, ticketid, ticket.amount);
    }


//-- ADMIN

    function getOperator() public view vlock returns (address) {
        return operator;
    }

    function setOperator(address any) external lock admin {
        operator = any;
    }

    function getTreasury() public view vlock admin returns (address) {
        return treasury;
    }

    function setTreasury(address payable any) external lock admin {
        treasury = any;
    }

    function getFees() public view vlock returns (uint) {
        return FEES;
    }

    function setFees(uint fee) external lock admin {
        FEES = fee;
    }

}

// END