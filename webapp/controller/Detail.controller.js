/*global location */
sap.ui.define([
	"masterdata/MasterData/controller/BaseController",
	"sap/ui/model/json/JSONModel",
	"masterdata/MasterData/model/formatter",
	'sap/m/MessageBox',
	'sap/m/MessageToast'
], function(BaseController, JSONModel, formatter, MessageBox, MessageToast) {
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
			this.tableArr = ["limitsStandart", "limitsExpress", "salesProgram", "fcaDomestic", "fcaProduct", "fcaResource", "productRecipe", "strategy", 
				"growthFactor", "salesScheme", "riskType", "salesDirection", "incoterms", "currency", "uom", "country"];

			// Define Dialog fragments inside view as depended of this view
			this.limitsExpressDialog = sap.ui.xmlfragment("fragment.limitsExpressDialog", this);
			this.limitsStandartDialog = sap.ui.xmlfragment("fragment.limitsStandartDialog", this);
			this.salesProgramDialog = sap.ui.xmlfragment("fragment.salesProgramDialog", this);
			this.fcaDomesticDialog = sap.ui.xmlfragment("fragment.fcaDomesticDialog", this);
			this.fcaProductDialog = sap.ui.xmlfragment("fragment.fcaProductDialog", this);
			this.fcaResourceDialog = sap.ui.xmlfragment("fragment.fcaResourceDialog", this);
			this.productRecipeDialog = sap.ui.xmlfragment("fragment.productRecipeDialog", this);
			this.strategyDialog = sap.ui.xmlfragment("fragment.strategyDialog", this);
			this.growthFactorDialog = sap.ui.xmlfragment("fragment.growthFactorDialog", this);
			this.salesSchemeDialog = sap.ui.xmlfragment("fragment.salesSchemeDialog", this);
			this.riskTypeDialog = sap.ui.xmlfragment("fragment.riskTypeDialog", this);
			this.salesDirectionDialog = sap.ui.xmlfragment("fragment.salesDirectionDialog", this);
			this.incotermsDialog = sap.ui.xmlfragment("fragment.incotermsDialog", this);
			this.currencyDialog = sap.ui.xmlfragment("fragment.currencyDialog", this);
			this.uomDialog = sap.ui.xmlfragment("fragment.uomDialog", this);
			this.countryDialog = sap.ui.xmlfragment("fragment.countryDialog", this);
			this.getView().addDependent(this.limitsExpressDialog);
			this.getView().addDependent(this.limitsStandartDialog);
			this.getView().addDependent(this.salesProgramDialog);
			this.getView().addDependent(this.fcaDomesticDialog);
			this.getView().addDependent(this.fcaProductDialog);
			this.getView().addDependent(this.fcaResourceDialog);
			this.getView().addDependent(this.productRecipeDialog);
			this.getView().addDependent(this.growthFactorDialog);
			this.getView().addDependent(this.salesSchemeDialog);
			this.getView().addDependent(this.riskTypeDialog);
			this.getView().addDependent(this.salesDirectionDialog);
			this.getView().addDependent(this.incotermsDialog);
			this.getView().addDependent(this.currencyDialog);
			this.getView().addDependent(this.uomDialog);
			this.getView().addDependent(this.countryDialog);
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
					this.getCount(table, tableCount);
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
			var tableTitle = oEvent.getParameter("arguments").objectTitle;
			this.byId("page").setTitle(tableTitle);
			for (var i = 0; i < this.tableArr.length; i++) {
				if (this.tableArr[i] === tableId) {
					var table = this.byId(tableId);
					var tableCount = this.byId(tableId + "Count");
					this.getCount(table, tableCount);
					table.setVisible(true);
					if(table.getItems().length === 0){
						table.bindItems({
							path: "/" + tableId + 'Set',
							template: table['mBindingInfos'].items.template
						});
					}
				} else {
					this.byId(this.tableArr[i]).setVisible(false);
				}
			}
		},

		// Event on selection of table items
		onTableSelect: function(oEvent) {
			var table = oEvent.getSource();
			var selectedCount = table.getSelectedItems().length;
			var tableId = table.getId().split("--")[table.getId().split("--").length - 1];
			if (selectedCount > 0) {
				this.byId(tableId + "Delete").setEnabled(true);
				this.byId(tableId + "Edit").setEnabled(true);
			} else {
				this.byId(tableId + "Delete").setEnabled(false);
				this.byId(tableId + "Edit").setEnabled(false);
			}
		},

		// Search function for all tables
		triggerSearch: function(oEvent) {
			var query = oEvent.getParameter("query");
			var table = oEvent.getSource().getParent().getParent();
		},

		// Table buttons function for create/edit/copy/delete of items
		tableAdd: function(oEvent) {
			var dialog = this.dialogOpen(oEvent);
			dialog.getButtons()[1].setVisible(true);
			dialog.getButtons()[2].setVisible(false);
		},
		tableEdit: function(oEvent) {
			var dialog = this.dialogOpen(oEvent);
			dialog.getButtons()[1].setVisible(false);
			dialog.getButtons()[2].setVisible(true);
		},
		tableDelete: function(oEvent) {
			MessageBox.confirm("Are you sure you want to delete?", {
				actions: ["Delete", sap.m.MessageBox.Action.CLOSE],
				onClose: function(sAction) {
					if (sAction === "Delete") {
						MessageToast.show("Deleted!");
					} else {
						MessageToast.show("Delete canceled!");
					}
				}
			});
		},

		// Function for openning the dialog for create/edit/copy functions
		// Also returns dialog object
		dialogOpen: function(oEvent) {
			var table = oEvent.getSource().getParent().getParent();
			var tableId = table.getId().split("--")[table.getId().split("--").length - 1];
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
			var tableId = oEvent.getSource().data("id");
			this[tableId + "Dialog"].close();
		},
		dialogEdit: function(oEvent) {
			var tableId = oEvent.getSource().data("id");
			this[tableId + "Dialog"].close();
		},
		
		// Getting count of table arguments: oTable = object table, oText = object text
		getCount: function(oTable, oText){
			var url = oTable.getModel().sServiceUrl + oTable.getBindingInfo("items").path;
			var that = this;
			$.get(url + "/$count", function(count){ 
					oText.setText(that.getResourceBundle().getText("tableItems", [count]));
				}
			);
		}
	});

});