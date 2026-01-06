function createPhonemeUI() {
  // ScriptUI パネル作成
  var win = new Window("palette", "Phoneme Layer Generator", undefined);
  win.orientation = "column";
  win.alignChildren = ["fill", "top"];
  win.spacing = 10;
  win.margins = 16;

  // ========== ファイル選択グループ ==========
  var fileGroup = win.add("group");
  fileGroup.orientation = "row";
  fileGroup.alignChildren = ["left", "center"];

  var fileLabel = fileGroup.add("statictext", undefined, "Lab File:");
  fileLabel.preferredSize.width = 60;

  var filePathText = fileGroup.add("edittext", undefined, "No file selected");
  filePathText.preferredSize.width = 250;
  filePathText.enabled = false;

  var browseBtn = fileGroup.add("button", undefined, "Browse...");

  // ========== 音素リストグループ ==========
  var listGroup = win.add("panel", undefined, "Select Phonemes");
  listGroup.orientation = "column";
  listGroup.alignChildren = ["fill", "top"];
  listGroup.spacing = 5;
  listGroup.margins = 10;
  listGroup.preferredSize = [400, 300];

  var scrollGroup = listGroup.add("group");
  scrollGroup.orientation = "column";
  scrollGroup.alignChildren = ["left", "top"];

  // 母音
  // a, i, u, e, o - 基本母音5つ

  // 特殊音素
  // N - 撥音（ん）
  // cl - 促音（っ）の閉鎖部分
  // pau - ポーズ（休止）
  // sil - 無音（silence）
  // br - ブレス（息継ぎ）

  // 子音
  // k, g - か行、が行
  // s, z - さ行、ざ行
  // t, d - た行、だ行
  // n - な行
  // h, b, p - は行、ば行、ぱ行
  // m - ま行
  // y - や行
  // r - ら行
  // w - わ行

  // よく使う音素のリスト
  var commonPhonemes = ["a", "i", "u", "e", "o", "N", "pau", "sil"];

  var phonemeData = [];
  var labFile = null;

  // ========== ボタングループ ==========
  var btnGroup1 = listGroup.add("group");
  btnGroup1.orientation = "row";
  btnGroup1.alignment = "center";

  var selectAllBtn = btnGroup1.add("button", undefined, "Select All");
  var deselectAllBtn = btnGroup1.add("button", undefined, "Deselect All");
  var selectCommonBtn = btnGroup1.add("button", undefined, "Select Common");

  // ========== 実行ボタン ==========
  var executeGroup = win.add("group");
  executeGroup.orientation = "row";
  executeGroup.alignment = "center";

  var createBtn = executeGroup.add("button", undefined, "Create Phoneme Layer");
  createBtn.preferredSize.width = 150;
  createBtn.enabled = false;

  var setupOpacityBtn = executeGroup.add("button", undefined, "Setup Opacity");
  setupOpacityBtn.preferredSize.width = 150;

  // ========== イベントハンドラ ==========

  // ファイル選択
  browseBtn.onClick = function () {
    labFile = File.openDialog("Select lab file", "*.lab");
    if (!labFile) return;

    filePathText.text = labFile.name;

    // labファイルをパース
    labFile.open("r");
    var content = labFile.read();
    labFile.close();

    var lines = content.split("\n");
    var phonemeSet = {};

    for (var i = 0; i < lines.length; i++) {
      if (lines[i].length === 0) continue;
      var parts = lines[i].split(/\s+/);
      if (parts.length >= 3) {
        var startTime = parseFloat(parts[0]) / 10000000;
        var endTime = parseFloat(parts[1]) / 10000000;
        var phoneme = parts[2].replace(/^\s+|\s+$/g, "");

        if (!phonemeSet[phoneme]) {
          phonemeSet[phoneme] = {
            phoneme: phoneme,
            count: 0,
            times: [],
          };
        }
        phonemeSet[phoneme].count++;
        phonemeSet[phoneme].times.push({ start: startTime, end: endTime });
      }
    }

    // UI更新：既存のチェックボックスをクリア
    phonemeData = [];
    for (var i = scrollGroup.children.length - 1; i >= 0; i--) {
      scrollGroup.remove(scrollGroup.children[i]);
    }

    // チェックボックス作成
    for (var phoneme in phonemeSet) {
      var cbGroup = scrollGroup.add("group");
      cbGroup.orientation = "row";
      cbGroup.alignChildren = ["left", "center"];

      var cb = cbGroup.add("checkbox", undefined, "");
      cb.value = false;

      // よく使う音素は初期選択
      for (var j = 0; j < commonPhonemes.length; j++) {
        if (phoneme === commonPhonemes[j]) {
          cb.value = true;
          break;
        }
      }

      var label = cbGroup.add(
        "statictext",
        undefined,
        phoneme + " (" + phonemeSet[phoneme].count + " times)"
      );
      label.preferredSize.width = 200;

      phonemeData.push({
        checkbox: cb,
        phoneme: phoneme,
        data: phonemeSet[phoneme],
      });
    }

    win.layout.layout(true);
    createBtn.enabled = true;
  };

  // 全選択
  selectAllBtn.onClick = function () {
    for (var i = 0; i < phonemeData.length; i++) {
      phonemeData[i].checkbox.value = true;
    }
  };

  // 全解除
  deselectAllBtn.onClick = function () {
    for (var i = 0; i < phonemeData.length; i++) {
      phonemeData[i].checkbox.value = false;
    }
  };

  // よく使うものを選択
  selectCommonBtn.onClick = function () {
    for (var i = 0; i < phonemeData.length; i++) {
      var isCommon = false;
      for (var j = 0; j < commonPhonemes.length; j++) {
        if (phonemeData[i].phoneme === commonPhonemes[j]) {
          isCommon = true;
          break;
        }
      }
      phonemeData[i].checkbox.value = isCommon;
    }
  };

  // Phonemeレイヤー作成
  createBtn.onClick = function () {
    var comp = app.project.activeItem;
    if (!comp) {
      alert("Please select a composition");
      return;
    }

    // 選択された音素のみ抽出
    var selectedPhonemes = [];
    for (var i = 0; i < phonemeData.length; i++) {
      if (phonemeData[i].checkbox.value) {
        for (var j = 0; j < phonemeData[i].data.times.length; j++) {
          selectedPhonemes.push({
            startTime: phonemeData[i].data.times[j].start,
            endTime: phonemeData[i].data.times[j].end,
            phoneme: phonemeData[i].phoneme,
          });
        }
      }
    }

    // 時間順にソート
    selectedPhonemes.sort(function (a, b) {
      return a.startTime - b.startTime;
    });

    app.beginUndoGroup("Create Phoneme Layer");

    // 既存のPhonemeレイヤーを削除
    for (var i = comp.numLayers; i >= 1; i--) {
      if (comp.layer(i).name === "Phoneme") {
        comp.layer(i).remove();
      }
    }

    // ヌルレイヤー作成
    var nullLayer = comp.layers.addNull();
    nullLayer.name = "Phoneme";

    // マーカー配置
    for (var i = 0; i < selectedPhonemes.length; i++) {
      var newMarker = new MarkerValue(selectedPhonemes[i].phoneme);
      nullLayer
        .property("Marker")
        .setValueAtTime(selectedPhonemes[i].startTime, newMarker);
    }

    app.endUndoGroup();

    alert(
      "Phoneme layer created with " + selectedPhonemes.length + " markers!"
    );
  };

  // 不透明度設定
  setupOpacityBtn.onClick = function () {
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

    // Phonemeレイヤー存在確認
    var phonemeLayerExists = false;
    for (var i = 1; i <= comp.numLayers; i++) {
      if (comp.layer(i).name === "Phoneme") {
        phonemeLayerExists = true;
        break;
      }
    }

    if (!phonemeLayerExists) {
      alert("Phoneme layer not found!");
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
      layer
        .property("ADBE Transform Group")
        .property("ADBE Opacity").expression = expr;
    }

    app.endUndoGroup();
    alert("Completed! Set expression on " + layers.length + " layers.");
  };

  win.center();
  win.show();
}

createPhonemeUI();
