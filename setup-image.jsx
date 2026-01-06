function setupPhonemeOpacity() {
  var comp = app.project.activeItem;
  if (!comp) {
    alert("Please select a composition");
    return;
  }

  var layers = comp.selectedLayers;
  if (layers.length === 0) {
    alert("Please select image layers");
    return;
  }

  // "Phoneme"レイヤーが存在するか確認
  var phonemeLayerExists = false;
  for (var i = 1; i <= comp.numLayers; i++) {
    if (comp.layer(i).name === "Phoneme") {
      phonemeLayerExists = true;
      break;
    }
  }

  if (!phonemeLayerExists) {
    alert("Phoneme layer not found! Please run marker script first.");
    return;
  }

  app.beginUndoGroup("Setup Phoneme Opacity");

  for (var i = 0; i < layers.length; i++) {
    var layer = layers[i];

    var exprLines = [
      'var phonemeLayer = thisComp.layer("Phoneme");',
      "var mrkr = phonemeLayer.marker;",
      "var idx = mrkr.nearestKey(time).index;",
      "if (mrkr.nearestKey(time).time > time) { idx--; }",
      "if (idx < 1) { idx = 1; }",
      "var currentPhoneme = mrkr.key(idx).comment;",
      'var layerName = thisLayer.name.replace(/\\.[^/.]+$/, "");',
      'var targetPhonemes = layerName.split(",");',
      "var isMatch = false;",
      "for (var i = 0; i < targetPhonemes.length; i++) {",
      "  if (currentPhoneme == targetPhonemes[i]) {",
      "    isMatch = true;",
      "    break;",
      "  }",
      "}",
      "isMatch ? 100 : 0;",
    ];

    var expr = exprLines.join("\n");

    layer.property("ADBE Transform Group").property("ADBE Opacity").expression =
      expr;
  }

  app.endUndoGroup();
  alert("Completed! Set expression on " + layers.length + " layers.");
}

setupPhonemeOpacity();
