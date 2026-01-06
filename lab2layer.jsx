function applyLabAsMarkers() {
  var labFile = File.openDialog("Select lab file", "*.lab");
  if (!labFile) return;

  labFile.open("r");
  var content = labFile.read();
  labFile.close();

  var comp = app.project.activeItem;
  if (!comp) {
    alert("Please select a composition");
    return;
  }

  app.beginUndoGroup("Apply Lab as Markers");

  // ヌルレイヤーを作成
  var nullLayer = comp.layers.addNull();
  nullLayer.name = "Phoneme";

  // labファイルをパースしてマーカーを配置
  var lines = content.split("\n");
  for (var i = 0; i < lines.length; i++) {
    if (lines[i].length === 0) continue;
    var parts = lines[i].split(/\s+/);
    if (parts.length >= 3) {
      var startTime = parseFloat(parts[0]) / 10000000;
      var phoneme = parts[2].replace(/^\s+|\s+$/g, "");

      var newMarker = new MarkerValue(phoneme);
      nullLayer.property("Marker").setValueAtTime(startTime, newMarker);
    }
  }

  app.endUndoGroup();
  alert("Phoneme null layer created with markers!");
}

applyLabAsMarkers();
