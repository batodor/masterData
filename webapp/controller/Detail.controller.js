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
			this.tableArr = [ "limitsStandart", "limitsExpress", "salesProgram", "fcaDomestic", "fcaProduct", "fcaResource", "productRecipe", "strategy", 
				"growthFactor", "salesScheme", "riskType", "salesDirection", "incoterms", "currency", "uom", "country", "rwStation", "port", "vesselType", "materialGroup", "poq", 
				"terminal", "legalEntity", "branch", "salesMarket", "bmqc", "sbmqc", "crossBorder", "productionUnit"];

			// Define all Dialog fragments inside view as depended of this view passing the tableArr of ids
			this.addDialogs(this.tableArr);
			
			var eventBus = sap.ui.getCore().getEventBus();
		    eventBus.subscribe("MainDetailChannel", "onNavigateEvent", this.onDataReceived, this);
		},
		
		// Passed data from Master view
		onDataReceived : function(channel, event, data) {
			this.byId("page").setTitle(data.title);
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
			for(var i in this.tableArr){
				if(this.byId(this.tableArr[i]).getVisible()){
					var table = this.byId(this.tableArr[i]);
					var tableCount = this.byId(this.tableArr[i] + "Count");
					this.getCount(table, tableCount, this.tableArr[i]);
				}
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
			var tableId = oEvent.getParameter("arguments").objectId;
			
			for (var i = 0; i < this.tableArr.length; i++) {
				if (this.tableArr[i] === tableId) {
					var table = this.byId(tableId);
					var tableCount = this.byId(tableId + "Count");
					this.getCount(table, tableCount, this.tableArr[i]);
					table.setVisible(true);
					if(table.getItems().length === 0){
						table.bindItems({
							path: "/" + tableId + 'Set',
							template: table['mBindingInfos'].items.template
						});
					}
				} else {
					// Just in case if any of the fragment (table) has syntax error
					try {
						this.byId(this.tableArr[i]).setVisible(false);
					} catch (err) {
						console.log("Error in table with ID: " + this.tableArr[i]);
					}
				}
			}
		},

		// Event on selection of table items
		onTableSelect: function(oEvent) {
			var table = oEvent.getSource();
			var selectedCount = table.getSelectedItems().length;
			var tableId = table.data("id");
			if (selectedCount > 0) {
				this.setInputEnabled([tableId + "Delete", tableId + "Edit"], true);
			} else {
				this.setInputEnabled([tableId + "Delete", tableId + "Edit"], false);
			}
		},
		
		// Enable/Disables inputs depending flag arg
		setInputEnabled: function(idArr, flag){
			for(var i in idArr){
				if(this.byId(idArr[i])){
					this.byId(idArr[i]).setEnabled(flag);
				}
			}
		},

		// Search function for all tables
		triggerSearch: function(oEvent) {
			var query = oEvent.getParameter("query"),
				id = oEvent.getSource().data('id'),
				key = oEvent.getSource().data('key'),
				oTable = this.byId(id),
				oViewModel = oTable.getModel(),
				filters = [];
			
			if(query){
				var keyFilter = new Filter(key, FilterOperator.Contains, query);
				filters.push(keyFilter);
			}
			
			oTable.getBinding("items").filter(filters, "Application");
			if (filters.length !== 0) {
				oViewModel.setProperty("/tableNoDataText", this.getResourceBundle().getText("worklistNoDataWithSearchText"));
			}
		},

		// Table buttons function for create/edit/copy/delete of items
		tableAdd: function(oEvent) {
			var id = oEvent.getSource().data("id");
			sap.ui.getCore().byId(id + "Dialog").unbindElement();
			var oDialog = this.dialogOpen(oEvent);
			this.setEnabled(oDialog, true);
			oDialog.getButtons()[1].setVisible(true);
			oDialog.getButtons()[2].setVisible(false);
		},
		tableEdit: function(oEvent) {
			var url = oEvent.getSource().getParent().getParent().getSelectedItem().getBindingContextPath();
			var id = oEvent.getSource().data("id");
			sap.ui.getCore().byId(id + "Dialog").bindElement(url);
			var oDialog = this.dialogOpen(oEvent);
			this.setEnabled(oDialog, false);
			oDialog.getButtons()[1].setVisible(false);
			oDialog.getButtons()[2].setVisible(true);
		},
		tableDelete: function(oEvent) {
			var url = oEvent.getSource().getParent().getParent().getSelectedItem().getBindingContextPath();
			var oModel = oEvent.getSource().getModel();
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

		// Function for openning the dialog for create/edit/copy functions
		// Also returns dialog object
		dialogOpen: function(oEvent) {
			var tableId = oEvent.getSource().data("id");
			for (var i = 0; i < this.tableArr.length; i++) {
				if (this.tableArr[i] === tableId) {
					this[tableId + "Dialog"].open();
					return this[tableId + "Dialog"];
				}
			}
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
		
		// Getting count of table, oTable = object table, oText = object text, tableId = string table id
		getCount: function(oTable, oText, tableId){
			if(oTable.mBindingInfos.items.path === ""){
				var url = oTable.getModel().sServiceUrl + '/' + tableId + 'Set';
				var that = this;
				$.ajax({
				    url: url + "/$count",
				    type: 'GET',
				    success: function(count){ 
				        oText.setText(that.getResourceBundle().getText("tableItems", [count]));
				    },
				    error: function() {
				        oText.setText(that.getResourceBundle().getText("tableItems", [0]));
				    }
				});
			}
		},
		
		// Set odata from any dialog, oDialog = object dialog / return object Data
		getOdata: function(oDialog){
			var oData = {};
			var inputs = oDialog.getAggregation("content");
			for(var i in inputs){
				if(inputs[i].getBindingInfo("value")){
					oData[inputs[i].getBindingInfo("value").binding.sPath] = inputs[i].getValue();
				}else if(inputs[i].getBindingInfo("dateValue")){
					oData[inputs[i].getBindingInfo("dateValue").binding.sPath] = inputs[i].getDateValue();
				}else if(inputs[i].getBindingInfo("selectedKey")){
					oData[inputs[i].getBindingInfo("selectedKey").binding.sPath] = inputs[i].getSelectedKey();
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
		}
	});

});