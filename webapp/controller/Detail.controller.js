/*global location */
sap.ui.define([
	"masterdata/MasterData/controller/BaseController",
	"sap/ui/model/json/JSONModel",
	"masterdata/MasterData/model/formatter",
	'sap/m/MessageBox',
	'sap/m/MessageToast',
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator"
], function(BaseController, JSONModel, formatter, MessageBox, MessageToast, Filter, FilterOperator) {
	"use strict";

	return BaseController.extend("masterdata.MasterData.controller.Detail", {

		formatter: formatter,

		/* =========================================================== */
		/* lifecycle methods                                           */
		/* =========================================================== */

		onInit: function() {
			// Model used to manipulate control states. The chosen values make sure,
			// detail page is busy indication immediately so there is no break in
			// between the busy indication for loading the view's meta data
			var oViewModel = new JSONModel({
				busy: false,
				delay: 0,
				lineItemListTitle: this.getResourceBundle().getText("detailLineItemTableHeading")
			});
			this.getRouter().getRoute("object").attachPatternMatched(this._onObjectMatched, this);
			this.setModel(oViewModel, "detailView");

			// Define list of tables ids
			this.tableArr = [ "limitsStandart", "limitsExpress", "salesProgram", "fcaDomestic", "fcaProduct", "fcaResource", "productRecipeHeader", "productRecipeItem", "strategy", 
				"growthFactor", "salesScheme", "riskType", "salesRegion", "incoterms", "currency", "uom", "country", "rwStation", "port", "vesselType", "materialGroup", "poq", 
				"terminal", "legalEntity", "branch", "salesMarket", "bmqc", "sbmqc", "crossBorder", "productionUnit", "addressType", "qualityParameters", "dqp", "material",
				"dictionaryBPInt", "benchmark", "portPopup", "qualityParametersUom", "qualityParametersPopup", "drq", "inflationFactor", "index", "currencyPopup", "interestRate",
				"geolocationPopup", "productionUnitPopup", "countryPopup"];
			
			this.typeArr = ["value", "dateValue", "selectedKey", "selected"];

			// Define all Dialog fragments inside view as depended of this view passing the tableArr of ids
			this.addDialogs(this.tableArr);
			
			var eventBus = sap.ui.getCore().getEventBus();
		    eventBus.subscribe("MainDetailChannel", "onNavigateEvent", this.onDataReceived, this);
		    
		    //Declare global filter
		    this.filter = []; // for router
		    this.search = {}; // for searchFields
		},
		
		// Passed data from Master view
		onDataReceived : function(channel, event, data) {
			this.byId("page").setTitle(data.title);
			if(data.filter){
				this.filter.push(data.filter);
			}else{
				this.filter = [];
			}
		},

		/* =========================================================== */
		/* begin: internal methods                                     */
		/* =========================================================== */

		/**
		 * Binds the view to the object path and expands the aggregated line items.
		 * @function
		 * @param {sap.ui.base.Event} oEvent pattern match event in route 'object'
		 * @private
		 */
		_onObjectMatched: function(oEvent) {
			this.id = oEvent.getParameter("arguments").objectId;
			var filter = oEvent.getParameter("arguments").filter;
			for (var i = 0; i < this.tableArr.length; i++) {
				if (this.tableArr[i] === this.id) {
					var table = this.byId(this.id);
					table.setVisible(true).removeSelections();
					// if no filter from eventBus
					if(filter && this.filter.length === 0){ 
						this.byId("page").setTitle("Recipe Number: " + filter);
						var filterKey = table.data("filter");
						this.filter.push(new Filter(filterKey, FilterOperator.EQ, filter));
					}
					table.bindItems({
						path: "/" + this.id + 'Set',
						template: table['mBindingInfos'].items.template,
						filters: this.filter
					});
					var toolbarContent = table.getHeaderToolbar().getContent();
					for (var j = 0; j < toolbarContent.length; j++) {
						if(toolbarContent[j].mProperties.hasOwnProperty("value")){
							toolbarContent[j].setValue("");
						}
					}
				} else {
					// Just in case if any of the fragment (table) has syntax error
					try {
						if(this.byId(this.tableArr[i])){
							this.byId(this.tableArr[i]).setVisible(false);
						}
					} catch (err) {
						console.log("Error in table with ID: " + this.tableArr[i]);
					}
				}
			}
			this.setInput(["tableAdd", "tableEdit", "tableDelete"], true, "Visible");
			this.setInput(["tableDetails"], false, "Visible");
			this.setInput(["tableEdit", "tableDelete", "tableDetails"], false, "Enabled");
			
			if(this.id === "country"){
				this.setInput(["tableAdd", "tableDelete"], false, "Visible");
			}else if(this.id === "productRecipeHeader"){
				this.byId("tableDetails").setVisible(true);
				this.byId("tableEdit").setVisible(false);
				this.byId('tableDetails').setText(this.getResourceBundle().getText("items"));
			}else if(this.id === "productRecipeItem"){
				this.byId("tableDetails").setVisible(true).setEnabled(true);
				this.byId('tableDetails').setText(this.getResourceBundle().getText("headers"));
			}else if(this.id === "currency"){
				this.setInput(["tableAdd", "tableEdit", "tableDelete"], false, "Visible");
			}else if(this.id === "productionUnit" || this.id === "salesProgram" || this.id === "bmqc" || this.id === "sbmqc" || this.id === "salesMarket" 
				|| this.id === "salesRegion" || this.id === "riskType" || this.id === "qualityParametersUom" || this.id === "qualityParameters"){
				this.byId("tableDelete").setVisible(false);
			}
			// Bind double click event
			this.byId(this.id).ondblclick = this.tableEdit.bind(this, this.id);
		},

		// Event on selection of table items
		onTableSelect: function(oEvent) {
			var table = oEvent.getSource();
			var selectedCount = table.getSelectedItems().length;
			var id = table.data("id");
			if (selectedCount > 0) {
				this.setInput(["tableDelete", "tableEdit", "tableDetails", id + "Select"], true, "Enabled");
			} else {
				this.setInput(["tableDelete", "tableEdit", "tableDetails", id + "Select"], false, "Enabled");
			}
			if(table.data("crud")){
				id = table.data("crud");
				this.setInput([ id + "Delete", id + "Edit"], true, "Enabled");
			}
		},
		
		// Enable/Disables inputs depending flag arg
		setInput: function(idArr, flag, func){
			var evalStr = 'input.set' + func + '(flag)';
			for(var i = 0; i < idArr.length; i++){
				var input = null;
				if(typeof idArr[i] === "string"){
					input = this.byId(idArr[i]) || sap.ui.getCore().byId(idArr[i]);
				}else if(typeof idArr[i] === "object"){
					input = idArr[i];
				}
				if(input){
					eval(evalStr);
				}
			}
		},

		// Search function for all tables
		triggerSearch: function(oEvent) {
			var query = oEvent.getParameter("query") || oEvent.getParameter("selected"),
				id = oEvent.getSource().data('id'),
				key = oEvent.getSource().data('key'),
				customOperator = oEvent.getSource().data('operator'),
				oTable = this.byId(id) || sap.ui.getCore().byId(id),
				filters = [];
			
			if(oEvent.getSource()["mProperties"].hasOwnProperty("selectedKey")){
				query = oEvent.getSource().getProperty("selectedKey");
			}
				
			if(!this.search[id]){ 
				this.search[id] = {};
			}
			if(typeof query !== "undefined"){
				var operator = FilterOperator.Contains;
				if(customOperator){
					operator = FilterOperator[customOperator];
				}
				this.search[id][key] = new Filter({path: key, operator: operator, value1: query });
			}else{
				delete this.search[id][key];
			}
			
			var filterKeys = Object.keys(this.search[id]);
			for(var i in filterKeys){
				filters.push(this.search[id][filterKeys[i]]);
			}
			var newFilter = new Filter({ filters: filters, and: true });
			if(filters.length === 0){
				newFilter = filters;
			}
			oTable.getBinding("items").filter(newFilter);
		},

		// Table buttons function for create/edit/copy/delete/details of items
		// Details used for second level details of current active table
		tableAdd: function(oEvent) {
			var id = oEvent.getSource().data("id") || this.id;
			var table = this.byId(id) || sap.ui.getCore().byId(id);
			var dialog = table.data("dialog") ? this[table.data("dialog") + "Dialog"] : this[id + "Dialog"];
			
			this.setEnabledDialog(dialog, true, true);
			if(this.filter.length > 0){
				var filterKey = this.filter[0].sPath;
				var value = this.filter[0].oValue1;
				sap.ui.getCore().byId(id + filterKey).setValue(value).setEnabled(false);
			}
			// Hide all buttons
			var buttons = dialog.getButtons();
			this.setInput(buttons, false, "Visible");
			
			// Then show the needed ones
			this.setInput([buttons[0], buttons[1]], true, "Visible");
			
			if(table.data("table")){
				var nextId = table.data("table");
				var nextTable = this.byId(nextId) || sap.ui.getCore().byId(nextId);
				var nextBlock = this.byId(nextId + "Block") || sap.ui.getCore().byId(nextId + "Block");
				nextBlock.setVisible(true);
				this.setInput([nextTable, buttons[1]], false, "Visible");
				this.setInput([buttons[2]], true, "Visible");
				this.setEnabledDialog(nextBlock, true, true);
				this.clearValues(nextBlock);
				if(table.data("crud")){
					this.clearValues(nextBlock);
					this.setEnabledDialog(dialog, true);
				}
			}
			
			var codes = ["salesMarket", "salesRegion", "riskType", "qualityParameters"];
			if(codes.indexOf(id) > -1){
				var inputCode = this.byId(id + "InputCode") || sap.ui.getCore().byId(id + "InputCode");
				var model = new sap.ui.model.json.JSONModel();
				model.loadData(table.getModel().sServiceUrl + "/dictionaryNextValueForCodeFieldSet");
				model.attachRequestCompleted(function(data) {
			        var code = data.getSource().getData().d.results[0][id];
			        inputCode.setValue(code);
			    });
			}
			
			dialog.open();
		},
		// Worst function, coz used as table edit and as double click on table for edit
		tableEdit: function(argument) {
			var id = typeof argument === 'string' ? argument : argument.getSource().data("id") || this.id;
			var table = this.byId(id) || sap.ui.getCore().byId(id);
			if(table.getSelectedItem()){
				var dialog = table.data("dialog") ? this[table.data("dialog") + "Dialog"] : this[id + "Dialog"];
				dialog.unbindElement();
				var url = table.getSelectedItem().getBindingContextPath();
				
				// if on doubleclick preview then disable inputs, else enable inputs
				typeof argument === 'string' ? this.setEnabledDialog(dialog, false) : this.setEnabledDialog(dialog, true);
				var buttons = dialog.getButtons();
				
				// Checks if edit dialog has inner table to bind it
				if(table.data("table")){
					var innerId = table.data("table");
					var innerTable = this.byId(innerId) || sap.ui.getCore().byId(innerId);
					var innerBlock = this.byId(innerId + "Block") || sap.ui.getCore().byId(innerId + "Block");
					
					// Also enabled/disable innerBlock inputs
					typeof argument === 'string' ? this.setEnabledDialog(innerBlock, false) : this.setEnabledDialog(innerBlock, true);
					
					// Check for flag to go to edit mode from dialog with inner table
					buttons[2].setVisible(false);
					if(table.data("crud")){
						this.setInput([innerTable, buttons[1], buttons[3], buttons[5]], false, "Visible");
						this.setInput([innerBlock], true, "Visible");
						
						if(typeof argument === 'string'){
							buttons[4].setVisible(true);
							buttons[6].setVisible(true).setEnabled(false);
						}else{
							buttons[4].setVisible(false);
							buttons[6].setVisible(true).setEnabled(true);
						}
					}else{
						this.setInput([innerBlock, buttons[4], buttons[6]], false, "Visible");
						this.setInput([innerTable, buttons[1], buttons[3], buttons[5]], true, "Visible");
						this.setInput([buttons[3], buttons[5]], false, "Enabled");
					}
					var nextUrl = url + "/" + innerId;
					innerTable.bindItems({
						path: nextUrl,
						template: innerTable['mBindingInfos'].items.template
					});
					innerTable.ondblclick = this.tableEdit.bind(this, innerId);
				}else{
					buttons[1].setVisible(false);
					if(this.byId("tableEdit").getVisible()){
						if(typeof argument === 'string'){
							buttons[2].setVisible(true);
							buttons[3].setVisible(true).setEnabled(false);
						}else{
							buttons[2].setVisible(false);
							buttons[3].setVisible(true);
						}
					}
				}
				dialog.bindElement(url);
				dialog.open();
			}else{
				return true;
			}
		},
		tableDelete: function(oEvent) {
			var id = oEvent.getSource().data("id") || this.id;
			var table = this.byId(id) || sap.ui.getCore().byId(id);
			var url = table.getSelectedItem().getBindingContextPath();
			var oModel = table.getModel();
			var settings = {};
			if(table.data("table")){
				var that = this;
				settings.success = function(){
					setTimeout(function(){
						if(table.getItems().length === 0){
							that[table.data("crud") + "Dialog"].close();
						}
					},10);
				};
			}
			MessageBox.confirm("Are you sure you want to delete?", {
				actions: ["Delete", sap.m.MessageBox.Action.CLOSE],
				onClose: function(sAction) {
					if (sAction === "Delete") {
						oModel.remove(url, settings);              
					} else {
						MessageToast.show("Delete canceled!");
					}
				}
			});
		},
		tableDetails: function(oEvent){
			var id = oEvent.getSource().data("id") || this.id;
			var oTable = this.byId(id) || sap.ui.getCore().byId(id);
			var key = oTable.data("key");
			var detailsTableId = oTable.data("details");
			var eventOptions = {};
			var routerOptions = {};
			if(key){
				var title = oTable.data("title");
				var filterKey = oTable.data("filter");
				var url = oTable.getSelectedItem().getBindingContextPath();
				var oData = oTable.getModel().getData(url);
				var filter = new Filter(filterKey, FilterOperator.EQ, oData[key]);
				eventOptions.filter = filter; // for tableDetails function
				eventOptions.title = oData[title];
				routerOptions.filter = oData[key]; // for router filtration
			}else{
				eventOptions.title = this.getResourceBundle().getText(detailsTableId);
			}
			var eventBus = sap.ui.getCore().getEventBus();
			eventBus.publish("MainDetailChannel", "onNavigateEvent", eventOptions);
			
			routerOptions.objectId = detailsTableId;
			this.getRouter().navTo("object", routerOptions);
		},

		// Close/create/save/edit/select dialog functions
		// Select used for valueHelp function
		dialogCancel: function(oEvent) {
			var tableId = oEvent.getSource().data("id");
			var dialog = this[tableId + "Dialog"];
			this.clearValues(dialog);
			dialog.close();
		},
		dialogAdd: function(oEvent) {
			var button = oEvent.getSource();
			var id = button.data("id");
			var dialog = button.getParent();
			var oModel = dialog.getModel();
			var oData = this.getOdata(dialog);
			var bCheckAlert = this.checkKeys(dialog);
			
			// Get odata from inner block
			if(button.data("block")){
				var innerBlock = sap.ui.getCore().byId(button.data("block"));
				oData = this.mergeObjects(oData, this.getOdata(innerBlock));
				bCheckAlert = bCheckAlert + this.checkKeys(innerBlock);
			}
			
			if(!bCheckAlert){
				// Check if dates from and to are ok
				var datesAlert = this.checkDates(oData);
				if(datesAlert){
					this.alertMsg(datesAlert);
					return true;
				}
				oModel.create("/" + id + "Set", oData);
				this[id + "Dialog"].close();
			}else{
				var msg = this.getModel('i18n').getResourceBundle().getText("plsEnter") + " " + bCheckAlert.slice(0, -2);
				this.alertMsg(msg);
			}
		},
		dialogSave: function(oEvent) {
			var tableId = oEvent.getSource().data("id");
			var dialog = sap.ui.getCore().byId(tableId + "Dialog");
			var url = dialog.getBindingContext().getPath();
			var oModel = dialog.getModel();
			var oData = this.getOdata(dialog);
			var bCheckAlert = this.checkKeys(dialog);
			
			// Get odata from inner block
			if(oEvent.getSource().data("block")){
				var innerBlock = sap.ui.getCore().byId(oEvent.getSource().data("block"));
				oData = this.mergeObjects(oData, this.getOdata(innerBlock));
			}
			
			if(!bCheckAlert){
				// Check if dates from and to are ok
				var datesAlert = this.checkDates(oData);
				if(datesAlert){
					this.alertMsg(datesAlert);
					return true;
				}
				dialog.unbindElement();
				oModel.update(url, oData);
				this[tableId + "Dialog"].close();
			}else{
				var msg = this.getModel('i18n').getResourceBundle().getText("plsEnter") + " " + bCheckAlert.slice(0, -2);
				this.alertMsg(msg);
			}
		},
		dialogEdit: function(oEvent){
			var button = oEvent.getSource();
			var id = button.data("id");
			var dialog = sap.ui.getCore().byId(id + "Dialog");
			var dialogButtons = dialog.getButtons();
			if(button.data("block")){
				var block = sap.ui.getCore().byId(button.data("block"));
				if(dialogButtons[6].getEnabled()){
					this.setEnabledDialog(block, false);
					dialogButtons[6].setEnabled(false);
				}else{
					this.setEnabledDialog(block, true);
					dialogButtons[6].setEnabled(true);
				}
			}else{
				if(dialog.getButtons()[3].getEnabled()){
					this.setEnabledDialog(dialog, false);
					dialogButtons[3].setEnabled(false);
				}else{
					this.setEnabledDialog(dialog, true);
					dialogButtons[3].setEnabled(true);
				}
			}
		},
		dialogSelect: function(oEvent){
			var button = oEvent.getSource();
			var id = button.data("id");
			var key = button.data("key");
			var item = sap.ui.getCore().byId(id).getSelectedItem();
			var path = item.getBindingContextPath();
			var data = item.getModel().getData(path);
			var customId = button.data("customId");
			var valueHelpInput = customId ? sap.ui.getCore().byId(customId) : sap.ui.getCore().byId(id + this.id + "ValueHelp");
			valueHelpInput.setValue(data[key]);
			this[id + "Dialog"].close();
		},
		
		// Set odata from any dialog, argument object = any object / return object inputs Data
		getOdata: function(object){
			var oData = {};
			var inputs = object.getAggregation("content");
			for(var i = 0; i < inputs.length; i++){
				var input = inputs[i];
				for(var j = 0; j < this.typeArr.length; j++){
					var type = this.typeArr[j];
					if(input.getBindingInfo(type)){
						var value = input.getProperty(type);
						var name = input.getBindingInfo(type).binding.sPath;
						
						// Set default value(placeholder) if value is not defined
						if(!value && input.mProperties.hasOwnProperty("placeholder")){
							value = input.mProperties.placeholder;
						}
						// if type of input is number then convert from string to number
						if(input.mProperties.hasOwnProperty("type") && input.getType() === "Number" && !input.data("type")){
							value = parseInt(value);
						}
						// If inputs name is not defined
						if(input.data("name")){
							name = input.data("name");
						}
						// Remove offset for dates
						if(input.hasOwnProperty("_oMaxDate")){
							value = input.getDateValue();
							if(value) {
								value.setMinutes(-value.getTimezoneOffset());
							} else { 
								value = null;
							}
						}
						oData[name] = value;
					}
				}
			}
			return oData;
		},
		
		// Set key inputs as disabled/enabled for editting
		// Arguments: dialog = object dialog, flag = boolean flag for enabled/disabled
		// all = boolean set all inputs
		setEnabledDialog: function(dialog, flag, all){
			var inputs = dialog.getAggregation("content");
			for(var i = 0; i < inputs.length; i++){
				for(var j = 0; j < this.typeArr.length; j++){
					var type = this.typeArr[j];
					var input = inputs[i];
					if(input.mBindingInfos.hasOwnProperty(type)){
						if(all){
							input.setEnabled(flag);
						}else{ 
							if(input.data("key") && !input.data("editable")){
								input.setEnabled(false);
							}else{
								input.setEnabled(flag);
							}
						}
					}
				}
			}
		},
		
		// Add all dialog xml fragments to this view as dependent
		// Arguments: tableArr = array of string ids of tables declared on init
		addDialogs: function(tableArr){
			for(var i = 0; i < tableArr.length; i++){
				// Just in case if any of the dialog fragment has syntax error
				try {
					this[tableArr[i] + "Dialog"] = sap.ui.xmlfragment("fragment." + tableArr[i] + "Dialog", this);
					this.getView().addDependent(this[tableArr[i] + "Dialog"]);
				} catch (err) {
					console.log("Error in dialog with ID: " + this.tableArr[i] + "Dialog");
				}
				
			}
		},
		
		// Checks the key inputs for empty values for dialog Add/Edit
		checkKeys: function(object){
			var check = "";
			var inputs = object.getAggregation("content");
			for(var i = 0; i < inputs.length; i++){
				var oInput = inputs[i];
				if(oInput.data("key")){
					if((oInput.mProperties.hasOwnProperty("value") && !oInput.getValue()) || 
					(oInput.mProperties.hasOwnProperty("selectedKey") && !oInput.getSelectedKey()) ||
					(oInput.mBindingInfos.hasOwnProperty("value") && !oInput.getValue()) ||
					(oInput.hasOwnProperty("_oMaxDate") && !oInput.getDateValue())){
						check = check + " " + this.getModel('i18n').getResourceBundle().getText(oInput.data("key")) + ", ";
					}
				}
			}
			return check;
		},
		
		// On value help opens new dialog with filters
		handleValueHelp: function(oEvent){
			var button = oEvent.getSource();
			var id = button.data("id");
			var bindSet = "/" + id + 'Set';
			if(button.data("set")){
				bindSet = "/" + button.data("set") + 'Set';
			}
			var customId = button.data("customId");
			var filters = button.data("filters");
			var table = sap.ui.getCore().byId(id);
			table.bindItems({
				path: bindSet,
				template: table['mBindingInfos'].items.template
			});
			this.search = {}; // nullify search object
			if(filters){
				var filtersArr = filters.split(',');
				for(var i = 0; i < filtersArr.length; i++){
					for(var j = 0; j < this.typeArr.length; j++){
						var input = sap.ui.getCore().byId(id + filtersArr[i] + "Filter");
						var type = this.typeArr[j];
						if(input.mProperties.hasOwnProperty(type)){
							input.setProperty(type);
						}
					}
				}
			}
			table.ondblclick = this.onDoubleClickSelect.bind(this, id);
			var select = this[id + "Dialog"].getButtons()[1];
			select.setEnabled(false);
			customId ? select.data("customId", customId) : select.data("customId", null);
			this[id + "Dialog"].open();
		},
		
		// Double click event to select row
		onDoubleClickSelect: function(id){
			var table = this.byId(id) || sap.ui.getCore().byId(id);
			if(table.getSelectedItem()){
				var button = this.byId(id + "Select") || sap.ui.getCore().byId(id + "Select");
				var key = button.data("key");
				var item = table.getSelectedItem();
				var path = item.getBindingContextPath();
				var data = item.getModel().getData(path);
				sap.ui.getCore().byId(id + this.id + "ValueHelp").setValue(data[key]);
				this[id + "Dialog"].close();
			}
		},
		
		// Clears all the input values in object(dialog)
		clearValues: function(object){
			var inputs = object.getAggregation("content");
			for(var i = 0; i < inputs.length; i++){
				for(var j = 0; j < this.typeArr.length; j++){
					var input = inputs[i];
					var type = this.typeArr[j];
					if(input.mProperties.hasOwnProperty(type)){
						var evalStr = 'input.set' + type.charAt(0).toUpperCase() + type.substr(1) + '("")';
						if(type === "dateValue"){
							var evalStr = 'input.setDateValue(null)';
						}
						eval(evalStr);
					}
				}
			}
		},
			
		checkValue: function(oEvent){
			var Input = oEvent.getSource();
			var maxValue = Input.data("max") ? parseInt(Input.data("max")) : 1000000000;
			var value = parseInt(oEvent.getParameter('newValue'));
			var valueState = isNaN(value) ? "Error" : value > maxValue ? "Error" : "Success";
			Input.setValueState(valueState);
		},
		
		// Object.assign doesnt work in IE so this function is created
		mergeObjects: function(objOne, objTwo){
			var objs = [objOne, objTwo],
		    result =  objs.reduce(function (r, o) {
		        Object.keys(o).forEach(function (k) {
		            r[k] = o[k];
		        });
		        return r;
		    }, {});
		    return result;
		},
		
		checkDates: function(oData){
			var check = "";
			if((oData.DateFrom && oData.DateTo) || (oData.FromDate && oData.ToDate)){
				var DateFrom = oData.DateFrom;
				var DateTo = oData.DateTo;
				if(oData.FromDate && oData.ToDate){
					DateFrom = oData.FromDate;
					DateTo = oData.ToDate;
				}
				if(DateFrom > DateTo){
					check = this.getResourceBundle().getText("wrongDates");
				}
			} 
			return check;
		},
		
		alertMsg: function(msg){
			MessageBox.alert(msg, {
				actions: [sap.m.MessageBox.Action.CLOSE]
			});
		}
	});

});