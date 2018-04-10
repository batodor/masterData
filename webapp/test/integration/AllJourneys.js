/*global QUnit*/

jQuery.sap.require("sap.ui.qunit.qunit-css");
jQuery.sap.require("sap.ui.thirdparty.qunit");
jQuery.sap.require("sap.ui.qunit.qunit-junit");
QUnit.config.autostart = false;

// We cannot provide stable mock data out of the template.
// If you introduce mock data, by adding .json files in your webapp/localService/mockdata folder you have to provide the following minimum data:
// * At least 3 CounterpartyListSet in the list
// * All 3 CounterpartyListSet have at least one ToComplianceRisks

sap.ui.require([
	"sap/ui/test/Opa5",
	"masterdata/MasterData/test/integration/pages/Common",
	"sap/ui/test/opaQunit",
	"masterdata/MasterData/test/integration/pages/App",
	"masterdata/MasterData/test/integration/pages/Browser",
	"masterdata/MasterData/test/integration/pages/Master",
	"masterdata/MasterData/test/integration/pages/Detail",
	"masterdata/MasterData/test/integration/pages/NotFound"
], function (Opa5, Common) {
	"use strict";
	Opa5.extendConfig({
		arrangements: new Common(),
		viewNamespace: "masterdata.MasterData.view."
	});

	sap.ui.require([
		"masterdata/MasterData/test/integration/MasterJourney",
		"masterdata/MasterData/test/integration/NavigationJourney",
		"masterdata/MasterData/test/integration/NotFoundJourney",
		"masterdata/MasterData/test/integration/BusyJourney",
		"masterdata/MasterData/test/integration/FLPIntegrationJourney"
	], function () {
		QUnit.start();
	});
});