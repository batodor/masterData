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
				"growthFactor", "salesScheme", "riskType", "salesDirection", "incoterms", "currency", "uom", "country", "rwStation", "port", "vesselType", "materialGroup", "poq", 
				"terminal", "legalEntity", "branch", "salesMarket", "bmqc", "sbmqc", "crossBorder", "productionUnit", "addressType", "qualityParameters", "dqp", "material"];

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
		/* event handlers                                              */
		/* =========================================================== */

		/**
		 * Event handler when the share by E-Mail button has been clicked
		 * @public
		 */
		onShareEmailPress: function() {
			var oViewModel = this.getModel("detailView");

			sap.m.URLHelper.triggerEmail(
				null,
				oViewModel.getProperty("/shareSendEmailSubject"),
				oViewModel.getProperty("/shareSendEmailMessage")
			);
		},

		/**
		 * Event handler when the share in JAM button has been clicked
		 * @public
		 */
		onShareInJamPress: function() {
			var oViewModel = this.getModel("detailView"),
				oShareDialog = sap.ui.getCore().createComponent({
					name: "sap.collaboration.components.fiori.sharing.dialog",
					settings: {
						object: {
							id: location.href,
							share: oViewModel.getProperty("/shareOnJamTitle")
						}
					}
				});

			oShareDialog.open();
		},

		/**
		 * Updates the item count within the line item table's header
		 * @param {object} oEvent an event containing the total number of items in the list
		 * @private
		 */
		onListUpdateFinished: function() {
			
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
			}
		},

		// Event on selection of table items
		onTableSelect: function(oEvent) {
			var table = oEvent.getSource();
			var selectedCount = table.getSelectedItems().length;
			var id = table.data("id");
			if (selectedCount > 0) {
				this.setInputEnabled(["tableDelete", "tableEdit", "tableDetails", id + "Save"], true);
			} else {
				this.setInputEnabled(["tableDelete", "tableEdit", "tableDetails", id + "Save"], false);
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
			var query = oEvent.getParameter("query"),
				id = oEvent.getSource().data('id'),
				key = oEvent.getSource().data('key'),
				operator = oEvent.getSource().data('operator'),
				oTable = this.byId(id),
				filters = [];
				
			if(oEvent.sId === "change"){
				query = oEvent.getParameter("newValue");
			}
			if(!oTable){
				oTable = sap.ui.getCore().byId(id);
			}
			if(query){
				var keyFilter = new Filter(key, FilterOperator.Contains, query);
				if(operator){
					keyFilter = new Filter(key, FilterOperator[operator], query);
				}
				filters.push(keyFilter);
			}
			
			oTable.getBinding("items").filter(filters, "Application");
		},

		// Table buttons function for create/edit/copy/delete of items
		tableAdd: function() {
			sap.ui.getCore().byId(this.id + "Dialog").unbindElement();
			var oDialog = this.dialogOpen();
			this.setEnabled(oDialog, true);
			if(this.filter.length > 0){
				var filterKey = this.filter[0].sPath;
				var value = this.filter[0].oValue1;
				sap.ui.getCore().byId(this.id + filterKey).setValue(value).setEnabled(false);
			}
			oDialog.getButtons()[1].setVisible(true);
			oDialog.getButtons()[2].setVisible(false);
		},
		tableEdit: function() {
			var url = this.byId(this.id).getSelectedItem().getBindingContextPath();
			sap.ui.getCore().byId(this.id + "Dialog").bindElement(url);
			var oDialog = this.dialogOpen();
			this.setEnabled(oDialog, false);
			oDialog.getButtons()[1].setVisible(false);
			oDialog.getButtons()[2].setVisible(true);
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

		// Function for openning the dialog for create/edit/copy functions
		// Also returns dialog object
		dialogOpen: function() {
			this[this.id + "Dialog"].open();
			return this[this.id + "Dialog"];
		},

		// Close/create/edit dialog functions
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
		dialogEdit: function(oEvent) {
			var tableId = oEvent.getSource().data("id");
			var dialog = sap.ui.getCore().byId(tableId + "Dialog");
			var url = dialog.getBindingContext().getPath();
			var oModel = dialog.getModel();
			var oData = this.getOdata(dialog);
			dialog.unbindElement();
			oModel.update(url, oData);
			this[tableId + "Dialog"].close();
		},
		dialogSave: function(oEvent){
			var id = oEvent.getSource().data("id");
			var key = oEvent.getSource().data("key");
			var item = sap.ui.getCore().byId(id).getSelectedItem();
			var path = item.getBindingContextPath();
			var data = item.getModel().getData(path);
			sap.ui.getCore().byId(id + "ValueHelp").setValue(data[key]);
			this[id + "Dialog"].close();
		},
		
		// Set odata from any dialog, oDialog = object dialog / return object Data
		getOdata: function(oDialog){
			var oData = {};
			var inputs = oDialog.getAggregation("content");
			var typeArr = ["value", "dateValue", "selectedKey", "selected"];
			for(var i in inputs){
				var input = inputs[i];
				for(var j in typeArr){
					var type = typeArr[j];
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
		
		// Set key inputs as disabled/enabled for editting, oDialog = object dialog, flag = boolean flag for enabled/disabled
		setEnabled: function(oDialog, flag){
			var inputs = oDialog.getAggregation("content");
			for(var i in inputs){
				if(inputs[i].data("key")){
					if(flag){
						inputs[i].setEnabled(true);
					}else{
						inputs[i].setEnabled(false);
					}
				}
			}
		},
		
		// Add all dialog xml fragments to this view as dependent, tableArr: array of string ids of tables
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
		
		// Checks the key values to lock them on update
		checkKeys: function(oDialog){
			var check = this.getModel('i18n').getResourceBundle().getText("plsEnter");
			var inputs = oDialog.getAggregation("content");
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
		
		onSuggest: function (oEvent) {
			var value = oEvent.getParameter("suggestValue");
			var filters = [];
			if (value) {
				filters = [
					new sap.ui.model.Filter([
						new Filter("Partner", FilterOperator.Contains, value),
						new Filter("Name", FilterOperator.Contains, value)
					], false)
				];
			}

			var searchField = oEvent.getSource();
			searchField.getBinding("suggestionItems").filter(filters);
			searchField.getBinding("suggestionItems").attachEventOnce('dataReceived', function() {
		        searchField.suggest();
		    }); 
		},
		
		handleValueHelp: function(oEvent){
			var id = oEvent.getSource().data("id");
			var table = sap.ui.getCore().byId(id);
			table.bindItems({
				path: "/" + id + 'Set',
				template: table['mBindingInfos'].items.template
			});
			this[id + "Dialog"].getButtons()[1].setEnabled(false);
			this[id + "Dialog"].open();
		}
	});

});