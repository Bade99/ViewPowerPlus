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

var calcBatteryTimeRemaining = (function(){

	//https://stackoverflow.com/questions/1535631/static-variables-in-javascript
	// Perform "static" variable initialization
    var wattage_accumulated = new Array(10);
	var index=0;
	var usable_range=0;
	
	return function(){
		//TODO(fran): if no big change has happened since the last execution of the function simply subtract 1 sec, only do this if we are on battery mode
		var e_voltage_output = document.getElementById("powerflow_[text.outputV]:");//expressed in Volts
		var e_wattage_output = document.getElementById("wattage");//expressed in Watts
		var e_battery_percentage = document.getElementById("powerflow_[text.BatteryPercent]:");//expressed in 0-100 (percentage)
		if(e_voltage_output != null && e_wattage_output != null && e_battery_percentage != null){

			wattage_accumulated[index++] = parseFloat(e_wattage_output.value);
			usable_range = Math.max(usable_range, index);
			index %= wattage_accumulated.length;
			let W_avg = parseFloat(0);
			for(let i = 0; i < usable_range; i++) W_avg+=wattage_accumulated[i];
			W_avg/=usable_range;

			//let seconds_remaining = Math.round(batteryRemainingSeconds(parseFloat(e_wattage_output.value), e_battery_percentage.value/parseFloat(100)));
			let seconds_remaining = Math.round(batteryRemainingSeconds(W_avg, e_battery_percentage.value/parseFloat(100)));
			
			var e_ups_mode = document.getElementById("powerflow_[text.workMod]:");
			if(e_ups_mode!=null){
				if(e_ups_mode.value == "Battery mode"){
					//We are on running on battery, AC has been cut off
					//Therefore we should subtract 1 second from the seconds_remaining each time this function gets executed
					//TODO(fran): better algorithm/idea for time subtracting
					if(seconds_remaining>0) seconds_remaining--;
				}
			}

			let outstr = secondsToHms(seconds_remaining);

			$("#battery_time_remaining").val(outstr);
		}
		
		setTimeout(calcBatteryTimeRemaining,1000);
	}
})();

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

			setTimeout(calcWattage,1000);//IMPORTANT TODO(fran): find another method to call this functions on a cycle, this is time dependent and future setTimeouts dont work depending on how long they take to execute 
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
