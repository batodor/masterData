/*global QUnit*/

jQuery.sap.require("sap.ui.qunit.qunit-css");
jQuery.sap.require("sap.ui.thirdparty.qunit");
jQuery.sap.require("sap.ui.qunit.qunit-junit");
QUnit.config.autostart = false;

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
		"masterdata/MasterData/test/integration/NavigationJourneyPhone",
		"masterdata/MasterData/test/integration/NotFoundJourneyPhone",
		"masterdata/MasterData/test/integration/BusyJourneyPhone"
	], function () {
		QUnit.start();
	});
});