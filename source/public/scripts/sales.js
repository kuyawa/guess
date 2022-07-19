// Sales

Date.prototype.addDays = function(days) {
    var date = new Date(this.valueOf());
    date.setDate(date.getDate() + days);
    return date;
}

function getDate(date) {
	let cc  = date;
	let yy  = cc.getFullYear()
	let mm  = (''+(cc.getMonth()+1)).padStart(2, '0');
	let dd  = (''+cc.getDate()).padStart(2,'0');
	let day = yy+mm+dd;
	return day;
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

async function onDay(num) {
	console.log('Date', session.salesDate, num);
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
	let now  = (days==0 ? new Date(hoy) : new Date(session.salesDate));
	let date = new Date(now.setDate(now.getDate() + days));
	let day  = getDate(date);
	await showCalendar(date);
	await loadSales();
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
	$('sales-title').innerHTML = 'Sales on ' + getMonthName(now) + ' ' + getDayNumber(now);
	session.salesDate = now;
}

async function loadSales(){
	let date = session.salesDate.toJSON().substr(0,10);
	let list = await fetch('/api/sales/'+date);
	let info = await list.json();
	console.log(info);
	listSales(info);
}

async function listSales(info){
	let htm = '';
	let tot = 0;
	let row = $('ui-row-sales').innerHTML;
	if(info.length>0){
		for (var i = 0; i < info.length; i++) {
			let item = info[i];
			tot += parseInt(item.total);
			htm+=row.replace('{eventid}', item.eventid)
			        .replace('{date}',    (new Date(item.day*1000)).toJSON().substr(0,10))
			        .replace('{teams}',   item.team1 + ' - ' + item.team2)
			        .replace('{count1}',  item.count1)
			        .replace('{count2}',  item.count2)
			        .replace('{option1}', item.option1)
			        .replace('{option2}', item.option2)
			        .replace('{total}',   item.total);
		}
	} else {
		htm = '<tr><td>&nbsp;</td><td class="center" colspan="6">No sales recorded</td><td>&nbsp;</td></tr>';
	}
	$('list-sales').tBodies[0].innerHTML = htm;
	$('sales-total').innerHTML = tot;
}

function initEvents(){}
