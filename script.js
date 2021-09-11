//INFO: in manifest.json it's important to indicate the content_scripts in order, if I need to use jquery I need to put jquery first on the array
//			"js": ["jquery-1.12.4.min.js", "script.js"]   /*This is correct*/
//			"js": ["script.js", "jquery-1.12.4.min.js"]   /*This won't work*/

//NOTE: this was made specifically for my ups which is a Vertiv Liebert PSL that has 900W and 2x 12V 9Ah(amp x hour) batteries

function createElementFromHTML(htmlString) {//https://stackoverflow.com/questions/494143/creating-a-new-dom-element-from-an-html-string-using-built-in-dom-methods-or-pro
  //NOTE: this wont work for all tags, I'll need to find a more robust way when the time comes
  var div = document.createElement('div');
  div.innerHTML = htmlString.trim();

  return div.firstElementChild; // Change this to div.childNodes to support multiple top-level nodes
}

function calcWattage(){
	var e_load_percentage = document.getElementById("powerflow_[label.loadPercents]:");
	if(e_load_percentage != null){
		var percentage = e_load_percentage.value;//TODO(fran): one thing to consider is that efficiency is different depending on the load, being least efficient at 0W and most at 900W, therefore we may actually have to increase the real W value shown to the user and used for other calculations such as estimated battery runtime

		var outstr = "" + Math.round((percentage/parseFloat(100))*900);

		$("#wattage").val(outstr);
	}
	setTimeout(calcWattage,2000);
}

function secondsToHms(sec) {
    sec = Number(sec);
    var h = Math.floor(sec / 3600);
    var m = Math.floor((sec % 3600) / 60);
    var s = Math.floor((sec % 3600) % 60);

    var hDisplay = h > 0 ? h : "00";
    var mDisplay = m > 9 ? m : (m>0? "0"+m : "00");
    var sDisplay = s > 9 ? s : (s>0? "0"+s : "00");
    return hDisplay +":"+ mDisplay +":"+ sDisplay; 
}

function batteryRemainingSeconds(watts, battery_percentage/*[0.0-1.0]*/){
	var sec = 5279.9225284961258 * Math.exp(-0.0055250579809*watts);//see "ups runtime graph.xlsx"
	return sec*battery_percentage;
}

function calcBatteryTimeRemaining(){
	//TODO(fran): my algorithm may not be correct and is also very very veery basic
		//TODO(fran): also remember that wattage vs battery time is not linear at all, both apc and eaton had some graphs we could convert into functions for times, idk whether vertiv/lierbert has some
	//TODO(fran): if no big change has happened since the last execution of the function simply subtract 1 sec, only do this if we are on battery mode
	var e_voltage_output = document.getElementById("powerflow_[text.outputV]:");//expressed in Volts
	var e_wattage_output = document.getElementById("wattage");//expressed in Watts
	var e_battery_percentage = document.getElementById("powerflow_[text.BatteryPercent]:");//expressed in 0-100 (percentage)
	if(e_voltage_output != null && e_wattage_output != null && e_battery_percentage != null){
		/*
		var V_out = parseFloat(e_voltage_output.value);//voltage
		var W_out = parseFloat(e_wattage_output.value);//wattage
		var Ah_remaining = (e_battery_percentage.value/parseFloat(100)) * 2 * 9;//amp x hour //TODO(fran): batteries are 12V, somehow that has to become 220V, that should probably be taken into account in some way
		//NOTE: equation: W = A x V   --->   A = W / V
		var A_current_consumption = W_out/V_out; //Current amps being consumed

		var seconds_remaining = Math.round((Ah_remaining/A_current_consumption)*3600);

		var outstr = secondsToHms(seconds_remaining);

		$("#battery_time_remaining").val(outstr);
		*/

		var seconds_remaining = Math.round(batteryRemainingSeconds(parseFloat(e_wattage_output.value), e_battery_percentage.value/parseFloat(100)));

		var outstr = secondsToHms(seconds_remaining);

		$("#battery_time_remaining").val(outstr);
	}
	
	setTimeout(calcBatteryTimeRemaining,1000);
}

$(document).ready(
	function(){
		//Wattage
		var e_load_percentage = document.getElementById("powerflow_[label.loadPercents]:");
		if(e_load_percentage != null){

			var div = createElementFromHTML(`
				<div style='display: table-row;'>
					<div style='display: table-cell; text-align: right;'>
						Output wattage
					</div>
					<div style='display: table-cell;vertical-align:middle; width: 60px;'>
						<input type='text' id='wattage' value='-' class='text' style='display:inline-block;' readonly='readonly'>
					</div>
					<div style='display: table-cell;vertical-align:middle;'>
						W
					</div>
				</div>
			`);

			e_load_percentage.parentElement.parentElement.parentElement.insertBefore(div,null);

			setTimeout(calcWattage,1000);//TODO(fran): find another method to call this functions on a cycle, this is time dependent and future setTimeouts dont work depending on how long they take to execute 
		}

		//Battery time remaining
		var e_battery_percentage = document.getElementById("powerflow_[text.BatteryPercent]:");
		if(e_battery_percentage != null){

			var div = createElementFromHTML(`
				<div style='display: table-row;'>
					<div style='display: table-cell; text-align: right;'>
						Estimated Runtime
					</div>
					<div style='display: table-cell;vertical-align:middle; width: 60px;'>
						<input type='text' id='battery_time_remaining' value='-' class='text' style='display:inline-block;' readonly='readonly'>
					</div>
					<div style='display: table-cell;vertical-align:middle;'>
						h:m:s
					</div>
				</div>
			`);

			e_battery_percentage.parentElement.parentElement.parentElement.insertBefore(div,null);

			setTimeout(calcBatteryTimeRemaining,1000);//NOTE: this MUST be equal to the wattage calculation timeout
		}
	}
)

/*
document.addEventListener("click", function(){
	var e_load_percentage = document.getElementById("powerflow_[label.loadPercents]:");
	if(e_load_percentage != null){
		var percentage = e_load_percentage.value;

		var outstr = "" + percentage/parseFloat(100)*900;//TODO(fran): allow the user to indicate max wattage output

		$("#wattage").val(outstr);
	}
	
	if(document.getElementById("wattage") != null){
		//document.getElementById("wattage").value = outstr; //TODO(fran): this doesnt work, I probably need to use jquery
	}
	else{
	//document.body.insertAdjacentHTML('beforeend', "<div><p id='wattage'>" + outstr + "</p></div>");
	}
	
});
*/

/*
document.addEventListener('DOMContentLoaded', function() {
    //var percentage = Number(document.getElementById("powerflow_[label.loadPercents]:").value) / parseFloat(100);
    //var res = percentage*900;
    //var out = "" + res;

  	var el = document.getElementById('powerflow_[label.loadPercents]:');
	var button = document.createElement("button");
	var text = document.createTextNode("test");
	button.appendChild(text);
	el.appendChild(button);
	}
);
*/

/*
var p = document.createElement('p');
p.innerHTML = "Watts";
p.id = "wattage";
var div = document.createElement('div');
div.style = "display: table-row;";//TODO(fran): idk whether I can use/access already existing styles from the page
div.appendChild(p);
*/

//var div = createElementFromHTML("<div style='display: table-row; '><p id='wattage'>Watts</p></div>")

//document.body.insertAdjacentHTML('beforeend', "<div><p id='wattage'>" + "Watts" + "</p></div>");