/*global history */
sap.ui.define([
	"masterdata/MasterData/controller/BaseController",
	"sap/ui/model/json/JSONModel",
	"sap/ui/core/routing/History",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"sap/m/GroupHeaderListItem",
	"sap/ui/Device",
	"masterdata/MasterData/model/formatter"
], function(BaseController, JSONModel, History, Filter, FilterOperator, GroupHeaderListItem, Device, formatter) {
	"use strict";

	return BaseController.extend("masterdata.MasterData.controller.Master", {

		formatter: formatter,

		/* =========================================================== */
		/* lifecycle methods                                           */
		/* =========================================================== */

		/**
		 * Called when the master list controller is instantiated. It sets up the event handling for the master/detail communication and other lifecycle tasks.
		 * @public
		 */
		onInit: function() {
			var oModel = new JSONModel(jQuery.sap.getModulePath("masterdata.MasterData.localService.mockdata", "/masterDataListSet.json"));
			var oViewModel = this._createViewModel();
			this._oList = this.byId("list");
			this._oList.setModel(oModel, "master");
			var oSorter = new sap.ui.model.Sorter('Order');
			this._oList.bindItems({
				path: 'master>/',
				template: this._oList['mBindingInfos'].items.template,
				sorter : oSorter
			});
			
			// keeps the filter and search state
			this._oListFilterState = {
				aFilter : [],
				aSearch : []
			};
			this.setModel(oViewModel, "masterView");
			
			// Send title of table after model loaded for the first time
			// Set selected item after first load
			var that = this;
			oModel.attachEventOnce("requestCompleted", function(){
				var oList = that.byId("list");
				var tableId = oList.data("selected");
				var data = oModel.getData();
				for(var i in data){
					if(data[i].Id === tableId){
						var eventBus = sap.ui.getCore().getEventBus();
						eventBus.publish("MainDetailChannel", "onNavigateEvent", { title : data[i].Title });
						
						if(data[i].Order > oList.getGrowingThreshold()){
							var oGrowingTrigger = that.byId('list-trigger');
							oGrowingTrigger.firePress();
						}
							
						var list = oList.getItems();
						for(var j in list){
							if(list[j].getTitle() === data[i].Title){
								list[j].setSelected(true).getDomRef().focus();
							}
						}
					}
				}
			});

			this.getRouter().getRoute("master").attachPatternMatched(this._onMasterMatched, this);
			this.getRouter().getRoute("object").attachPatternMatched(this._onObjectMatched, this);
		},

		/* =========================================================== */
		/* event handlers                                              */
		/* =========================================================== */
		
		onUpdateFinished : function (oEvent) {
			// update the master list object counter after new data is loaded
			this._updateListItemCount(oEvent.getParameter("total"));
			// hide pull to refresh if necessary
			//this.byId("pullToRefresh").hide();
			//this.getCount();
			var parameters = oEvent.getParameters();
			var actual = parameters.actual;
			if(parameters.reason === "Growing" && actual !== 0){
				var oList = oEvent.getSource();
				var threshold = oList.getGrowingThreshold();
				var oGrowingTrigger = this.byId('list-trigger');
				oGrowingTrigger.firePress();
			}
		},
			
		/**
		 * Event handler for the master search field. Applies current
		 * filter value and triggers a new search. If the search field's
		 * 'refresh' button has been pressed, no new search is triggered
		 * and the list binding is refresh instead.
		 * @param {sap.ui.base.Event} oEvent the search event
		 * @public
		 */
		onSearch: function(oEvent) {
			if (oEvent.getParameters().refreshButtonPressed) {
				// Search field's 'refresh' button has been pressed.
				// This is visible if you select any master list item.
				// In this case no new search is triggered, we only
				// refresh the list binding.
				this.onRefresh();
				return;
			}

			var sQuery = oEvent.getParameter("query");
			if (sQuery) {
				this._oListFilterState.aSearch = [new Filter("Title", FilterOperator.Contains, sQuery)];
			} else {
				this._oListFilterState.aSearch = [];
			}
			this._applyFilterSearch();

		},

		/**
		 * Event handler for refresh event. Keeps filter, sort
		 * and group settings and refreshes the list binding.
		 * @public
		 */
		onRefresh: function() {
			this._oList.getBinding("items").refresh();
		},

		/**
		 * Event handler for the list selection event
		 * @param {sap.ui.base.Event} oEvent the list selectionChange event
		 * @public
		 */
		onSelectionChange: function(oEvent) {
			var oList = oEvent.getSource(),
				bSelected = oEvent.getParameter("selected");

			// skip navigation when deselecting an item in multi selection mode
			if (!(oList.getMode() === "MultiSelect" && !bSelected)) {
				// get the list item, either from the listItem parameter or from the event's source itself (will depend on the device-dependent mode).
				this._showDetail(oEvent.getParameter("listItem") || oEvent.getSource());
			}
		},

		/**
		 * Used to create GroupHeaders with non-capitalized caption.
		 * These headers are inserted into the master list to
		 * group the master list's items.
		 * @param {Object} oGroup group whose text is to be displayed
		 * @public
		 * @returns {sap.m.GroupHeaderListItem} group header with non-capitalized caption.
		 */
		createGroupHeader: function(oGroup) {
			return new GroupHeaderListItem({
				title: oGroup.text,
				upperCase: false
			});
		},

		/**
		 * Event handler for navigating back.
		 * It there is a history entry or an previous app-to-app navigation we go one step back in the browser history
		 * If not, it will navigate to the shell home
		 * @public
		 */
		onNavBack: function() {
			var sPreviousHash = History.getInstance().getPreviousHash(),
				oCrossAppNavigator = sap.ushell.Container.getService("CrossApplicationNavigation");

			if (sPreviousHash !== undefined || !oCrossAppNavigator.isInitialNavigation()) {
				history.go(-1);
			} else {
				oCrossAppNavigator.toExternal({
					target: {
						shellHash: "#Shell-home"
					}
				});
			}
		},
		
		/* =========================================================== */
		/* begin: internal methods                                     */
		/* =========================================================== */


		_createViewModel : function() {
			return new JSONModel({
				isFilterBarVisible: false,
				filterBarLabel: "",
				delay: 0,
				title: this.getResourceBundle().getText("masterTitleCount", [0]),
				noDataText: this.getResourceBundle().getText("masterListNoDataText"),
				sortBy: "Title",
				groupBy: "None"
			});
		},

		/**
		 * If the master route was hit (empty hash) we have to set
		 * the hash to to the first item in the list as soon as the
		 * listLoading is done and the first item in the list is known
		 * @private
		 */
		_onMasterMatched: function(oEvent) {
			this.getRouter().navTo("object", {
				objectId: "country"
			}, true);
		},

		// Append custom data of table id for getting title of table after model loaded for first time
		_onObjectMatched: function(oEvent) {
			var tableId = oEvent.getParameter("arguments").objectId;
			this._oList.data("selected", tableId);
		},

		/**
		 * Shows the selected item on the detail page
		 * On phones a additional history entry is created
		 * @param {sap.m.ObjectListItem} oItem selected Item
		 * @private
		 */
		_showDetail: function(oItem) {
			var bReplace = !Device.system.phone;
			this.getRouter().navTo("object", {
				objectId: oItem.data("id")
			}, bReplace);
			
			var eventBus = sap.ui.getCore().getEventBus();
			eventBus.publish("MainDetailChannel", "onNavigateEvent", { title : oItem.data("title") });
		},

		/**
		 * Sets the item count on the master list header
		 * @param {integer} iTotalItems the total number of items in the list
		 * @private
		 */
		_updateListItemCount: function(iTotalItems) {
			var sTitle;
			// only update the counter if the length is final
			if (this._oList.getBinding("items").isLengthFinal()) {
				sTitle = this.getResourceBundle().getText("masterTitleCount", [iTotalItems]);
				this.getModel("masterView").setProperty("/title", sTitle);
			}
		},

		/**
		 * Internal helper method to apply both filter and search state together on the list binding
		 * @private
		 */
		_applyFilterSearch: function() {
			var aFilters = this._oListFilterState.aSearch.concat(this._oListFilterState.aFilter),
				oViewModel = this.getModel("masterView");
			this._oList.getBinding("items").filter(aFilters, "Application");
			// changes the noDataText of the list in case there are no filter results
			if (aFilters.length !== 0) {
				oViewModel.setProperty("/noDataText", this.getResourceBundle().getText("masterListNoDataWithFilterOrSearchText"));
			} else if (this._oListFilterState.aSearch.length > 0) {
				// only reset the no data text to default when no new search was triggered
				oViewModel.setProperty("/noDataText", this.getResourceBundle().getText("masterListNoDataText"));
			}
		},

		/**
		 * Internal helper method to apply both group and sort state together on the list binding
		 * @param {sap.ui.model.Sorter[]} aSorters an array of sorters
		 * @private
		 */
		_applyGroupSort: function(aSorters) {
			this._oList.getBinding("items").sort(aSorters);
		},

		/**
		 * Internal helper method that sets the filter bar visibility property and the label's caption to be shown
		 * @param {string} sFilterBarText the selected filter value
		 * @private
		 */
		_updateFilterBar: function(sFilterBarText) {
			var oViewModel = this.getModel("masterView");
			oViewModel.setProperty("/isFilterBarVisible", (this._oListFilterState.aFilter.length > 0));
			oViewModel.setProperty("/filterBarLabel", this.getResourceBundle().getText("masterFilterBarText", [sFilterBarText]));
		}

	});

});