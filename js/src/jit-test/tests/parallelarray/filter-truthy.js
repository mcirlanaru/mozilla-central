load(libdir + "parallelarray-helpers.js");

function testFilterMisc() {
  function truthy(e, i, c) {
    switch (i % 6) {
      case 0: return 1;
      case 1: return "";
      case 2: return {};
      case 3: return [];
      case 4: return false;
      case 5: return true;
    }
  }

  compareAgainstArray(range(0, minItemsTestingThreshold), "filter", truthy);
}

if (getBuildConfiguration().parallelJS)
  testFilterMisc();
