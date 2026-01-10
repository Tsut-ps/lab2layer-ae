/**
 * lab2layer
 * @version 0.4.0
 * @author Tsut-ps
 * @description labファイルを解析して音素レイヤーを生成 + 不透明度エクスプレッションを設定するツール
 */

function createPhonemeUI(thisObj) {
  // ScriptUI Panelsフォルダから実行された場合はドッカブルパネル、それ以外は別ウィンドウ
  var win =
    thisObj instanceof Panel
      ? thisObj
      : new Window("palette", "lab2layer", undefined, { resizeable: true });
  win.orientation = "column";
  win.alignChildren = ["fill", "top"];
  win.spacing = 10;
  win.margins = 16;

  // ========== ファイル選択グループ ==========
  var fileGroup = win.add("group");
  fileGroup.orientation = "row";
  fileGroup.alignChildren = ["left", "center"];
  fileGroup.alignment = ["fill", "top"];

  var fileLabel = fileGroup.add("statictext", undefined, "Lab File:");

  var filePathText = fileGroup.add("edittext", undefined, "No file selected");
  filePathText.alignment = ["fill", "center"];
  filePathText.enabled = false;

  var browseBtn = fileGroup.add("button", undefined, "...");
  browseBtn.preferredSize = [30, 25];
  browseBtn.alignment = ["right", "center"];
  browseBtn.helpTip = "Browse for lab file";

  // ========== 音素リストグループ ==========
  var listGroup = win.add("panel", undefined, "Select Phonemes");
  listGroup.orientation = "column";
  listGroup.alignChildren = ["fill", "top"];
  listGroup.alignment = ["fill", "fill"];
  listGroup.spacing = 5;
  listGroup.margins = 10;
  listGroup.minimumSize = [200, 150];

  // スクロール可能なグループ
  var scrollGroup = listGroup.add("group");
  scrollGroup.orientation = "column";
  scrollGroup.alignChildren = ["fill", "top"];
  scrollGroup.alignment = ["fill", "fill"];
  scrollGroup.spacing = 2;

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
  btnGroup1.alignment = ["fill", "bottom"];
  btnGroup1.alignChildren = ["fill", "center"];
  btnGroup1.spacing = 5;

  var selectAllBtn = btnGroup1.add("button", undefined, "All");
  selectAllBtn.alignment = ["fill", "center"];
  var deselectAllBtn = btnGroup1.add("button", undefined, "None");
  deselectAllBtn.alignment = ["fill", "center"];
  var selectCommonBtn = btnGroup1.add("button", undefined, "Common");
  selectCommonBtn.alignment = ["fill", "center"];

  // ========== 実行ボタン ==========
  var executeGroup = win.add("group");
  executeGroup.orientation = "row";
  executeGroup.alignment = ["fill", "bottom"];
  executeGroup.alignChildren = ["fill", "center"];
  executeGroup.spacing = 10;

  var createBtn = executeGroup.add("button", undefined, "Create Phoneme Layer");
  createBtn.alignment = ["fill", "center"];
  createBtn.enabled = false;

  var setupOpacityBtn = executeGroup.add("button", undefined, "Setup Opacity");
  setupOpacityBtn.alignment = ["fill", "center"];

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

    // 音素を優先順にソート
    var sortedPhonemes = [];

    // 1. よく使う音素を優先（存在するもののみ）
    for (var i = 0; i < commonPhonemes.length; i++) {
      if (phonemeSet[commonPhonemes[i]]) {
        sortedPhonemes.push({
          phoneme: commonPhonemes[i],
          count: phonemeSet[commonPhonemes[i]].count,
        });
      }
    }

    // 2. それ以外の音素を出現回数の多い順に追加
    var otherPhonemes = [];
    for (var phoneme in phonemeSet) {
      var isCommon = false;
      for (var j = 0; j < commonPhonemes.length; j++) {
        if (phoneme === commonPhonemes[j]) {
          isCommon = true;
          break;
        }
      }
      if (!isCommon) {
        otherPhonemes.push({
          phoneme: phoneme,
          count: phonemeSet[phoneme].count,
        });
      }
    }

    // 出現回数の多い順にソート（降順）
    otherPhonemes.sort(function (a, b) {
      return b.count - a.count;
    });

    sortedPhonemes = sortedPhonemes.concat(otherPhonemes);

    // UI更新：既存のチェックボックスをクリア
    phonemeData = [];
    for (var i = scrollGroup.children.length - 1; i >= 0; i--) {
      scrollGroup.remove(scrollGroup.children[i]);
    }

    // チェックボックスを横3列で配置
    var currentRow = null;
    var colCount = 0;

    for (var i = 0; i < sortedPhonemes.length; i++) {
      var phoneme = sortedPhonemes[i].phoneme;
      var count = sortedPhonemes[i].count;

      // 3列ごとに新しい行を作成
      if (colCount === 0) {
        currentRow = scrollGroup.add("group");
        currentRow.orientation = "row";
        currentRow.alignment = ["fill", "top"];
        currentRow.alignChildren = ["fill", "center"];
        currentRow.spacing = 5;
      }

      var itemGroup = currentRow.add("group");
      itemGroup.orientation = "row";
      itemGroup.alignment = ["fill", "center"];
      itemGroup.alignChildren = ["left", "center"];
      itemGroup.spacing = 2;

      var cb = itemGroup.add("checkbox", undefined, "");
      cb.value = false;

      // よく使う音素は初期選択
      for (var j = 0; j < commonPhonemes.length; j++) {
        if (phoneme === commonPhonemes[j]) {
          cb.value = true;
          break;
        }
      }

      var label = itemGroup.add(
        "statictext",
        undefined,
        phoneme + "(" + count + ")"
      );
      label.minimumSize.width = 50;

      phonemeData.push({
        checkbox: cb,
        phoneme: phoneme,
        data: phonemeSet[phoneme],
      });

      colCount++;
      if (colCount >= 3) {
        colCount = 0;
      }
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

    if (selectedPhonemes.length === 0) {
      alert("Please select at least one phoneme");
      return;
    }

    // 時間順にソート
    selectedPhonemes.sort(function (a, b) {
      return a.startTime - b.startTime;
    });

    // セリフの開始時間と終了時間を計算（labファイル内の相対時間）
    var labStartTime = selectedPhonemes[0].startTime;
    var labEndTime = selectedPhonemes[selectedPhonemes.length - 1].endTime;
    var duration = labEndTime - labStartTime;

    // 現在の再生位置を取得
    var currentTime = comp.time;

    app.beginUndoGroup("Create Phoneme Layer");

    // ヌルレイヤー作成（現在の再生位置に配置）
    var nullLayer = comp.layers.addNull(duration);
    nullLayer.name = "Phoneme";
    nullLayer.startTime = currentTime;

    // マーカー配置（現在の再生位置からの相対位置）
    for (var i = 0; i < selectedPhonemes.length; i++) {
      var markerTime =
        currentTime + (selectedPhonemes[i].startTime - labStartTime);
      var newMarker = new MarkerValue(selectedPhonemes[i].phoneme);
      nullLayer.property("Marker").setValueAtTime(markerTime, newMarker);
    }

    app.endUndoGroup();

    alert(
      "Phoneme layer created with " +
        selectedPhonemes.length +
        " markers!\n" +
        "Duration: " +
        duration.toFixed(2) +
        "s at " +
        currentTime.toFixed(2) +
        "s"
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
      alert("Phoneme layer not found! Please create it first.");
      return;
    }

    app.beginUndoGroup("Setup Phoneme Opacity");

    for (var i = 0; i < layers.length; i++) {
      var layer = layers[i];

      var exprLines = [
        "var phonemeLayer = null;",
        "for (var i = 1; i <= thisComp.numLayers; i++) {",
        "  var layer = thisComp.layer(i);",
        '  if (layer.name === "Phoneme" && time >= layer.inPoint && time < layer.outPoint) {',
        "    phonemeLayer = layer;",
        "    break;",
        "  }",
        "}",
        "var result = 0;",
        "var phoneme = null;",
        "if (phonemeLayer && phonemeLayer.marker.numKeys > 0) {",
        "  var marker = phonemeLayer.marker;",
        "  var index = marker.nearestKey(time).index;",
        "  if (marker.key(index).time > time) index--;",
        "  if (index >= 1) {",
        "    phoneme = marker.key(index).comment;",
        "  }",
        "}",
        "if (phoneme !== null) {",
        '  if ((","+thisLayer.name+",").indexOf(","+phoneme+",") >= 0) result = 100;',
        "} else {",
        '  if ((","+thisLayer.name+",").indexOf(",def,") >= 0) result = 100;',
        "}",
        "result;",
      ];

      var expr = exprLines.join("\n");
      layer
        .property("ADBE Transform Group")
        .property("ADBE Opacity").expression = expr;
    }

    app.endUndoGroup();
    alert("Completed! Set expression on " + layers.length + " layers.");
  };

  // リサイズ対応
  win.onResizing = win.onResize = function () {
    this.layout.resize();
  };

  // パネルの場合はlayout、ウィンドウの場合はcenter+show
  if (win instanceof Window) {
    win.center();
    win.show();
  } else {
    win.layout.layout(true);
    win.layout.resize();
  }
}

createPhonemeUI(this);
