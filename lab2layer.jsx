/**
 * lab2layer
 * @version 0.7.3
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
  var fileSelectGroup = win.add("group");
  fileSelectGroup.orientation = "row";
  fileSelectGroup.alignChildren = ["left", "center"];
  fileSelectGroup.alignment = ["fill", "top"];

  var fileLabel = fileSelectGroup.add("statictext", undefined, "Lab File:");

  var filePathText = fileSelectGroup.add(
    "edittext",
    undefined,
    "No file selected"
  );
  filePathText.alignment = ["fill", "center"];
  filePathText.enabled = false;

  var browseBtn = fileSelectGroup.add("button", undefined, "...");
  browseBtn.preferredSize = [30, 25];
  browseBtn.alignment = ["right", "center"];
  browseBtn.helpTip = "Browse for lab file";

  // ========== 音素リストグループ ==========
  var phonemeListPanel = win.add("panel", undefined, "Select Phonemes");
  phonemeListPanel.orientation = "column";
  phonemeListPanel.alignChildren = ["fill", "top"];
  phonemeListPanel.alignment = ["fill", "fill"];
  phonemeListPanel.spacing = 5;
  phonemeListPanel.margins = 10;
  phonemeListPanel.minimumSize = [200, 150];

  // ========== 音素チェックボックス ==========
  var phonemeCheckboxGroup = phonemeListPanel.add("group");
  phonemeCheckboxGroup.orientation = "column";
  phonemeCheckboxGroup.alignChildren = ["fill", "top"];
  phonemeCheckboxGroup.alignment = ["fill", "fill"];
  phonemeCheckboxGroup.spacing = 2;

  // 母音
  // a, i, u, e, o - 基本母音5つ

  // 特殊音素
  // N - 撥音（ん）
  // cl, Q - 促音（っ）
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
  var commonPhonemes = [
    "a",
    "i",
    "u",
    "e",
    "o",
    "N",
    "pau",
    "sil",
    "cl",
    "Q",
    "br",
  ];

  var phonemeData = [];
  var labFile = null;

  // ========== 一括選択ボタングループ ==========
  var phonemeSelectorGroup = phonemeListPanel.add("group");
  phonemeSelectorGroup.orientation = "row";
  phonemeSelectorGroup.alignment = ["fill", "bottom"];
  phonemeSelectorGroup.alignChildren = ["fill", "center"];
  phonemeSelectorGroup.spacing = 5;

  var selectAllBtn = phonemeSelectorGroup.add("button", undefined, "All");
  selectAllBtn.alignment = ["fill", "center"];
  var deselectAllBtn = phonemeSelectorGroup.add("button", undefined, "None");
  deselectAllBtn.alignment = ["fill", "center"];
  var selectCommonBtn = phonemeSelectorGroup.add("button", undefined, "Common");
  selectCommonBtn.alignment = ["fill", "center"];

  // ========== オフセット設定グループ ==========
  var offsetGroup = win.add("group");
  offsetGroup.orientation = "row";
  offsetGroup.alignment = ["fill", "top"];
  offsetGroup.alignChildren = ["left", "center"];
  offsetGroup.spacing = 5;

  var offsetLabel = offsetGroup.add("statictext", undefined, "Offset (ms):");
  var offsetInput = offsetGroup.add("edittext", undefined, "-67");
  offsetInput.preferredSize = [60, 25];
  offsetInput.helpTip =
    "動画先行の法則: 映像は音声より数フレーム速いほうが自然に見えます（負の値=映像先行）";

  var frameMinus = offsetGroup.add("button", undefined, "<");
  frameMinus.preferredSize = [35, 25];
  frameMinus.helpTip = "1フレーム戻す（映像をさらに先行）";

  var framePlus = offsetGroup.add("button", undefined, ">");
  framePlus.preferredSize = [35, 25];
  framePlus.helpTip = "1フレーム進める";

  // ========== 実行ボタン ==========
  var executeGroup = win.add("group");
  executeGroup.orientation = "row";
  executeGroup.alignment = ["fill", "bottom"];
  executeGroup.alignChildren = ["fill", "center"];
  executeGroup.spacing = 10;

  var createBtn = executeGroup.add("button", undefined, "Create");
  createBtn.alignment = ["fill", "center"];
  createBtn.enabled = false;

  var deleteMarkersBtn = executeGroup.add("button", undefined, "Delete");
  deleteMarkersBtn.alignment = ["fill", "center"];

  var setupOpacityBtn = executeGroup.add("button", undefined, "Setup Opacity");
  setupOpacityBtn.alignment = ["fill", "center"];

  // ========== イベントハンドラ ==========

  // フレーム調整ヘルパー関数（選択レイヤーのマーカーを移動）
  function adjustMarkersByFrames(frames) {
    var comp = app.project.activeItem;
    if (!comp) {
      alert("Please select a composition");
      return;
    }

    var layers = comp.selectedLayers;
    if (layers.length === 0) {
      alert("Please select layer(s) with markers");
      return;
    }

    var frameSec = 1 / 30; // デフォルト30fps
    if (comp.frameRate) {
      frameSec = 1 / comp.frameRate;
    }
    var offsetSec = frames * frameSec;

    app.beginUndoGroup("Adjust Markers");

    var totalAdjusted = 0;
    for (var i = 0; i < layers.length; i++) {
      var layer = layers[i];
      var markers = layer.property("Marker");
      var numMarkers = markers.numKeys;

      if (numMarkers === 0) continue;

      // マーカー情報を一時保存
      var markerData = [];
      for (var j = 1; j <= numMarkers; j++) {
        markerData.push({
          time: markers.keyTime(j) + offsetSec,
          value: markers.keyValue(j),
        });
      }

      // 全マーカーを削除
      for (var j = numMarkers; j >= 1; j--) {
        markers.removeKey(j);
      }

      // 新しい時間で再配置
      for (var j = 0; j < markerData.length; j++) {
        markers.setValueAtTime(markerData[j].time, markerData[j].value);
      }

      totalAdjusted += numMarkers;
    }

    app.endUndoGroup();
  }

  // フレーム調整ボタン
  frameMinus.onClick = function () {
    adjustMarkersByFrames(-1);
  };

  framePlus.onClick = function () {
    adjustMarkersByFrames(1);
  };

  // ファイル選択
  browseBtn.onClick = function () {
    labFile = File.openDialog("Select lab file", "*.lab");
    if (!labFile) return;

    filePathText.text = decodeURI(labFile.name);

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
    for (var i = phonemeCheckboxGroup.children.length - 1; i >= 0; i--) {
      phonemeCheckboxGroup.remove(phonemeCheckboxGroup.children[i]);
    }

    // チェックボックスを横3列で配置
    var currentRow = null;
    var colCount = 0;

    for (var i = 0; i < sortedPhonemes.length; i++) {
      var phoneme = sortedPhonemes[i].phoneme;
      var count = sortedPhonemes[i].count;

      // 3列ごとに新しい行を作成
      if (colCount === 0) {
        currentRow = phonemeCheckboxGroup.add("group");
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

    // レイアウトを更新
    phonemeCheckboxGroup.layout.layout(true);
    phonemeListPanel.layout.layout(true);
    win.layout.layout(true);
    win.layout.resize();

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

    // 選択されたレイヤーがあればそれに直接マーカーを追加、なければヌルレイヤーを作成
    var selectedLayers = comp.selectedLayers;
    var targetLayer = null;
    var attachTime = comp.time;

    // 選択レイヤーから音声/映像レイヤーを探す
    for (var i = 0; i < selectedLayers.length; i++) {
      var layer = selectedLayers[i];
      // 音声レイヤーまたはAVレイヤー（映像付き音声）を探す
      if (layer.hasAudio || layer.source instanceof FootageItem) {
        targetLayer = layer;
        attachTime = layer.inPoint;
        break;
      }
    }

    app.beginUndoGroup("Create Phoneme Layer");

    // 音声レイヤーがなければヌルレイヤーを作成
    if (!targetLayer) {
      targetLayer = comp.layers.addNull(duration);
      // labファイル名から拡張子を除いた名前を使用
      var layerName = labFile
        ? decodeURI(labFile.name).replace(/\.lab$/i, "")
        : "Phoneme";
      targetLayer.name = "[P] " + layerName;
      targetLayer.startTime = attachTime;
    } else {
      // 既存レイヤーに[P]プレフィックスがなければ追加
      if (targetLayer.name.indexOf("[P] ") !== 0) {
        targetLayer.name = "[P] " + targetLayer.name;
      }
    }

    // オフセット値を取得（ミリ秒→秒に変換）
    var offsetMs = parseFloat(offsetInput.text) || 0;
    var offsetSec = offsetMs / 1000;

    // 既存のマーカーを全て削除
    var markers = targetLayer.property("Marker");
    var numMarkers = markers.numKeys;
    for (var i = numMarkers; i >= 1; i--) {
      markers.removeKey(i);
    }

    // マーカー配置
    for (var i = 0; i < selectedPhonemes.length; i++) {
      var markerTime =
        attachTime + (selectedPhonemes[i].startTime - labStartTime) + offsetSec;
      var newMarker = new MarkerValue(selectedPhonemes[i].phoneme);
      targetLayer.property("Marker").setValueAtTime(markerTime, newMarker);
    }

    app.endUndoGroup();

    var message =
      "Phoneme markers added: " +
      selectedPhonemes.length +
      "\n" +
      "Duration: " +
      duration.toFixed(2) +
      "s\n" +
      "Target: " +
      targetLayer.name;
    alert(message);
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

    // プロジェクト内のコンポジション一覧を取得
    var compNames = [];
    for (var i = 1; i <= app.project.numItems; i++) {
      var item = app.project.item(i);
      if (item instanceof CompItem) {
        compNames.push(item.name);
      }
    }

    // コンポジション選択ダイアログ
    var dialog = new Window("dialog", "Select Phoneme Composition");
    dialog.orientation = "column";
    dialog.alignChildren = ["fill", "top"];

    dialog.add("statictext", undefined, "Phoneme layer location:");
    var compDropdown = dialog.add("dropdownlist", undefined, compNames);

    // 現在のコンポジションをデフォルト選択
    for (var i = 0; i < compNames.length; i++) {
      if (compNames[i] === comp.name) {
        compDropdown.selection = i;
        break;
      }
    }
    if (!compDropdown.selection && compNames.length > 0) {
      compDropdown.selection = 0;
    }

    var dialogBtnGroup = dialog.add("group");
    dialogBtnGroup.add("button", undefined, "OK", { name: "ok" });
    dialogBtnGroup.add("button", undefined, "Cancel", { name: "cancel" });

    if (dialog.show() !== 1) return;
    if (!compDropdown.selection) {
      alert("Please select a composition");
      return;
    }

    var targetCompName = compDropdown.selection.text;

    app.beginUndoGroup("Setup Phoneme Opacity");

    for (var i = 0; i < layers.length; i++) {
      var layer = layers[i];

      var exprLines = [
        'var targetComp = comp("' + targetCompName + '");',
        "",
        "function findPhonemeLayer() {",
        "  for (var i = 1; i <= targetComp.numLayers; i++) {",
        "    var layer = targetComp.layer(i);",
        '    if (layer.name.indexOf("[P] ") !== 0) continue;',
        "    if (layer.marker.numKeys === 0) continue;",
        "    if (time < layer.inPoint || time >= layer.outPoint) continue;",
        "    return layer;",
        "  }",
        "  return null;",
        "}",
        "",
        "function getPhoneme(phonemeLayer) {",
        "  if (!phonemeLayer) return null;",
        "  var marker = phonemeLayer.marker;",
        "  var index = marker.nearestKey(time).index;",
        "  if (marker.key(index).time > time) index--;",
        "  if (index < 1) return null;",
        "  return marker.key(index).comment;",
        "}",
        "",
        "function matchesName(name) {",
        '  return (","+thisLayer.name+",").indexOf(","+name+",") >= 0;',
        "}",
        "",
        "var phonemeLayer = findPhonemeLayer();",
        "var phoneme = getPhoneme(phonemeLayer);",
        'phoneme !== null ? (matchesName(phoneme) ? 100 : 0) : (matchesName("def") ? 100 : 0);',
      ];

      var expr = exprLines.join("\n");
      layer
        .property("ADBE Transform Group")
        .property("ADBE Opacity").expression = expr;

      // レイヤーを表示状態にする
      layer.enabled = true;
    }

    app.endUndoGroup();
    alert(
      "Completed! Set expression on " +
        layers.length +
        " layers.\nPhoneme source: " +
        targetCompName
    );
  };

  // マーカー削除
  deleteMarkersBtn.onClick = function () {
    var comp = app.project.activeItem;
    if (!comp) {
      alert("Please select a composition");
      return;
    }

    var layers = comp.selectedLayers;
    if (layers.length === 0) {
      alert("Please select a layer with markers");
      return;
    }

    var totalDeleted = 0;

    app.beginUndoGroup("Delete Markers");

    for (var i = 0; i < layers.length; i++) {
      var layer = layers[i];
      var markers = layer.property("Marker");
      var numMarkers = markers.numKeys;

      // マーカーを後ろから削除（インデックスがずれないように）
      for (var j = numMarkers; j >= 1; j--) {
        markers.removeKey(j);
        totalDeleted++;
      }

      // マーカーが全て削除されたら[P]プレフィックスを削除
      if (numMarkers > 0 && layer.name.indexOf("[P] ") === 0) {
        layer.name = layer.name.substring(4);
      }
    }

    app.endUndoGroup();

    if (totalDeleted > 0) {
      alert(
        "Deleted " +
          totalDeleted +
          " markers from " +
          layers.length +
          " layer(s)."
      );
    } else {
      alert("No markers found on selected layer(s).");
    }
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
