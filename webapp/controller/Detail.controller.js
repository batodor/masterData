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
			this.tableArr = ["limitsStandart", "limitsExpress", "salesProgram"];

			// Define Dialog fragments inside view as depended of this view
			this.limitsExpressDialog = sap.ui.xmlfragment("fragment.limitsExpressDialog", this);
			this.limitsStandartDialog = sap.ui.xmlfragment("fragment.limitsStandartDialog", this);
			this.salesProgramDialog = sap.ui.xmlfragment("fragment.salesProgramDialog", this);
			this.getView().addDependent(this.limitsExpressDialog);
			this.getView().addDependent(this.limitsStandartDialog);
			this.getView().addDependent(this.salesProgramDialog);
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
		onListUpdateFinished: function(oEvent) {
			var sTitle,
				iTotalItems = oEvent.getParameter("total"),
				oViewModel = this.getModel("detailView");

			// only update the counter if the length is final
			if (this.byId("lineItemsList").getBinding("items").isLengthFinal()) {
				if (iTotalItems) {
					sTitle = this.getResourceBundle().getText("detailLineItemTableHeadingCount", [iTotalItems]);
				} else {
					//Display 'Line Items' instead of 'Line items (0)'
					sTitle = this.getResourceBundle().getText("detailLineItemTableHeading");
				}
				oViewModel.setProperty("/lineItemListTitle", sTitle);
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
					var count = table.getItems().length;
					var tableCount = this.byId(tableId + "Count");
					tableCount.setText(this.getResourceBundle().getText("tableItems", [count]));
					table.setVisible(true);
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
			var selected = this.byId(tableId + "Selected");
			if (selectedCount > 0) {
				selected.setVisible(true);
				this.byId(tableId + "Delete").setEnabled(true);
				this.byId(tableId + "Edit").setEnabled(true);
				selected.setText(this.getResourceBundle().getText("tableSelected", [selectedCount]));
			} else {
				this.byId(tableId + "Delete").setEnabled(false);
				this.byId(tableId + "Edit").setEnabled(false);
				selected.setVisible(false);
			}
		},

		// Search function for all tables
		triggerSearch: function(oEvent) {
			var query = oEvent.getParameter("query");
			var table = oEvent.getSource().getParent().getParent();
		},

		// Table buttons function for create/edit/copy/delete of items
		tableCreate: function(oEvent) {
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
		dialogClose: function(oEvent) {
			var tableId = oEvent.getSource().data("id");
			this[tableId + "Dialog"].close();
		},
		dialogCreate: function(oEvent) {
			var tableId = oEvent.getSource().data("id");
			console.log(tableId);
		},
		dialogEdit: function(oEvent) {
			var tableId = oEvent.getSource().data("id");
			console.log(tableId);
		}
	});

});