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
				"dictionaryBPInt", "benchmark", "portPopup", "qualityParametersUom", "qualityParametersPopup", "drq"];
			
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
			this.setInputVisible(["tableAdd", "tableEdit", "tableDelete"], true);
			this.setInputVisible(["tableDetails"], false);
			this.setInputEnabled(["tableEdit", "tableDelete", "tableDetails"], false);
			
			if(this.id === "country"){
				this.setInputVisible(["tableAdd", "tableDelete"], false);
			}else if(this.id === "productRecipeHeader"){
				this.setInputVisible(["tableDetails"], true);
				this.setInputVisible(["tableEdit"], false);
				this.byId('tableDetails').setText(this.getResourceBundle().getText("items"));
			}else if(this.id === "productRecipeItem"){
				this.setInputVisible(["tableDetails"], true);
				this.setInputEnabled(["tableDetails"], true);
				this.byId('tableDetails').setText(this.getResourceBundle().getText("headers"));
			}else if(this.id === "currency"){
				this.setInputVisible(["tableAdd", "tableEdit", "tableDelete"], false);
			}else if(this.id === "dqp"){
				this.setInputVisible(["tableEdit"], false);
			}
			
			// Bind double click event
			this.byId(this.id).ondblclick = this.onDoubleClick.bind(this, this.id);
		},

		// Event on selection of table items
		onTableSelect: function(oEvent) {
			var table = oEvent.getSource();
			var selectedCount = table.getSelectedItems().length;
			var id = table.data("id");
			if (selectedCount > 0) {
				this.setInputEnabled(["tableDelete", "tableEdit", "tableDetails", id + "Select"], true);
			} else {
				this.setInputEnabled(["tableDelete", "tableEdit", "tableDetails", id + "Select"], false);
			}
		},
		
		// Enable/Disables inputs depending flag arg
		setInputEnabled: function(idArr, flag){
			for(var i in idArr){
				if(this.byId(idArr[i])){
					this.byId(idArr[i]).setEnabled(flag);
				}else if(sap.ui.getCore().byId(idArr[i])){
					sap.ui.getCore().byId(idArr[i]).setEnabled(flag);
				}
			}
		},
		
		// Enable/Disables inputs depending flag arg
		setInputVisible: function(idArr, flag){
			for(var i in idArr){
				if(this.byId(idArr[i])){
					this.byId(idArr[i]).setVisible(flag);
				}
			}
		},

		// Search function for all tables
		triggerSearch: function(oEvent) {
			var query = oEvent.getParameter("query") || oEvent.getParameter("newValue"),
				id = oEvent.getSource().data('id'),
				key = oEvent.getSource().data('key'),
				customOperator = oEvent.getSource().data('operator'),
				oTable = this.byId(id) || sap.ui.getCore().byId(id),
				filters = [];
				
			if(!this.search[id]){ 
				this.search[id] = {};
			}
			if(query){
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
		tableAdd: function() {
			var dialog = this[this.id + "Dialog"];
			dialog.unbindElement();
			this.setEnabledDialog(dialog, true);
			if(this.filter.length > 0){
				var filterKey = this.filter[0].sPath;
				var value = this.filter[0].oValue1;
				sap.ui.getCore().byId(this.id + filterKey).setValue(value).setEnabled(false);
			}
			var buttons = dialog.getButtons();
			buttons[1].setVisible(true);
			buttons[2].setVisible(false);
			buttons[3].setVisible(false);
			dialog.open();
		},
		tableEdit: function() {
			var table = this.byId(this.id);
			var dialog = this[this.id + "Dialog"];
			var url = table.getSelectedItem().getBindingContextPath();
			sap.ui.getCore().byId(this.id + "Dialog").bindElement(url);
			this.setEnabledDialog(dialog, false);
			var buttons = dialog.getButtons();
			buttons[1].setVisible(false);
			buttons[2].setVisible(false);
			buttons[3].setVisible(true).setEnabled(true);
			if(table.data("table")){
				var nextTable = sap.ui.getCore().byId(table.data("table"));
				var nextUrl = url + "/" + table.data("table");
				nextTable.bindItems({
					path: nextUrl,
					template: nextTable['mBindingInfos'].items.template
				});
			}
			dialog.open();
		},
		tableDelete: function() {
			var url = this.byId(this.id).getSelectedItem().getBindingContextPath();
			var oModel = this.byId(this.id).getModel();
			MessageBox.confirm("Are you sure you want to delete?", {
				actions: ["Delete", sap.m.MessageBox.Action.CLOSE],
				onClose: function(sAction) {
					if (sAction === "Delete") {
						oModel.remove(url);              
					} else {
						MessageToast.show("Delete canceled!");
					}
				}
			});
		},
		tableDetails: function(){
			var oTable = this.byId(this.id);
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
			this[tableId + "Dialog"].close();
		},
		dialogAdd: function(oEvent) {
			var button = oEvent.getSource();
			var tableId = button.data("id");
			var dialog = button.getParent();
			var oModel = dialog.getModel();
			var oData = this.getOdata(dialog);
			var bCheckAlert = this.checkKeys(dialog);
			if(bCheckAlert === "Please, enter"){
				oModel.create("/" + tableId + "Set", oData);
				this[tableId + "Dialog"].close();
			}else{
				MessageBox.alert(bCheckAlert.slice(0, -2), {
					actions: [sap.m.MessageBox.Action.CLOSE]
				});
			}
		},
		dialogSave: function(oEvent) {
			var tableId = oEvent.getSource().data("id");
			var dialog = sap.ui.getCore().byId(tableId + "Dialog");
			var url = dialog.getBindingContext().getPath();
			var oModel = dialog.getModel();
			var oData = this.getOdata(dialog);
			dialog.unbindElement();
			oModel.update(url, oData);
			this[tableId + "Dialog"].close();
		},
		dialogEdit: function(oEvent){
			var button = oEvent.getSource();
			var id = button.data("id");
			var dialog = sap.ui.getCore().byId(id + "Dialog");
			if(dialog.getButtons()[3].getEnabled()){
				this.setDisabledDialog(dialog);
				dialog.getButtons()[3].setEnabled(false);
			}else{
				this.setEnabledDialog(dialog, false);
				dialog.getButtons()[3].setEnabled(true);
			}
		},
		dialogSelect: function(oEvent){
			var id = oEvent.getSource().data("id");
			var key = oEvent.getSource().data("key");
			var item = sap.ui.getCore().byId(id).getSelectedItem();
			var path = item.getBindingContextPath();
			var data = item.getModel().getData(path);
			sap.ui.getCore().byId(id + this.id + "ValueHelp").setValue(data[key]);
			this[id + "Dialog"].close();
		},
		
		// Set odata from any dialog, argument oDialog = object dialog / return object inputs Data
		getOdata: function(dialog){
			var oData = {};
			var inputs = dialog.getAggregation("content");
			for(var i in inputs){
				var input = inputs[i];
				for(var j in this.typeArr){
					var type = this.typeArr[j];
					if(input.getBindingInfo(type)){
						var value = input.getProperty(type);
						var name = input.getBindingInfo(type).binding.sPath;
						if(input.mProperties.hasOwnProperty("type") && input.getType() === "Number"){
							value = parseInt(value);
						}
						if(input.data("name")){
							name = input.data("name");
						}
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
		setEnabledDialog: function(dialog, flag){
			var inputs = dialog.getAggregation("content");
			for(var i in inputs){
				for(var j in this.typeArr){
					var type = this.typeArr[j];
					var input = inputs[i];
					if(input.mBindingInfos.hasOwnProperty(type)){
						if(input.data("key")){
							input.setEnabled(flag);
						}else{
							input.setEnabled(true);
						}
					}
				}
				
			}
		},
		
		// Set key all inputs as disabled for editting
		// Arguments: dialog = object dialog
		setDisabledDialog: function(dialog){
			var inputs = dialog.getAggregation("content");
			for(var i in inputs){
				for(var j in this.typeArr){
					var type = this.typeArr[j];
					var input = inputs[i];
					if(input.mBindingInfos.hasOwnProperty(type)){
						input.setEnabled(false);
					}
				}
			}
		},
		
		// Add all dialog xml fragments to this view as dependent
		// Arguments: tableArr = array of string ids of tables declared on init
		addDialogs: function(tableArr){
			for(var i in tableArr){
				// Just in case if any of the dialog fragment has syntax error
				try {
					this[tableArr[i] + "Dialog"] = sap.ui.xmlfragment("fragment." + tableArr[i] + "Dialog", this);
					this.getView().addDependent(this[tableArr[i] + "Dialog"]);
				} catch (err) {
					console.log("Error in dialog with ID: " + this.tableArr[i] + "Dialog");
				}
				
			}
		},
		
		// Checks the key values to lock them on dialogEdit
		checkKeys: function(dialog){
			var check = this.getModel('i18n').getResourceBundle().getText("plsEnter");
			var inputs = dialog.getAggregation("content");
			for(var i in inputs){
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
			var id = oEvent.getSource().data("id");
			var bindSet = "/" + id + 'Set';
			if(oEvent.getSource().data("set")){
				bindSet = "/" + oEvent.getSource().data("set") + 'Set';
			}
			var filters = oEvent.getSource().data("filters");
			var table = sap.ui.getCore().byId(id);
			table.bindItems({
				path: bindSet,
				template: table['mBindingInfos'].items.template
			});
			this.search = {}; // nullify search object
			if(filters){
				var filtersArr = filters.split(',');
				for(var i in filtersArr){
					for(var j in this.typeArr){
						var input = sap.ui.getCore().byId(id + filtersArr[i] + "Filter");
						var type = this.typeArr[j];
						if(input.mProperties.hasOwnProperty(type)){
							input.setProperty(type);
						}
					}
				}
			}
			table.ondblclick = this.onDoubleClickSelect.bind(this, id);
			this[id + "Dialog"].getButtons()[1].setEnabled(false);
			this[id + "Dialog"].open();
		},
		
		// Double click event to open dialog
		onDoubleClick: function(id){
			if(this.byId(id).getSelectedItem()){
				var table = this.byId(id);
				var dialog = this[id + "Dialog"];
				var url = table.getSelectedItem().getBindingContextPath();
				dialog.bindElement(url);
				this.setDisabledDialog(dialog);
				dialog.getButtons()[1].setVisible(false);
				if(this.byId("tableEdit").getVisible()){
					dialog.getButtons()[2].setVisible(true);
					dialog.getButtons()[3].setVisible(true).setEnabled(false);
				}
				if(table.data("table")){
					var nextTable = this.byId(table.data("table")) || sap.ui.getCore().byId(table.data("table"));
					var nextUrl = url + "/" + table.data("table");
					nextTable.bindItems({
						path: nextUrl,
						template: nextTable['mBindingInfos'].items.template
					});
				}
				dialog.open();
			}else{
				return true;
			}
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
		}
	});

});