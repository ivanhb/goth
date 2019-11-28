var GR_FILE = null;
var JAGO_MODEL_INDEX = null;
var SUBCLASS_KEY = "@isSubclassOf"

$("#select_operation *").attr("disabled", true);


//When selecting a graphml file ->
//read and encode it in "UTF-8" and send it to the server
var gr_input = document.getElementById("select_local_gr_input");
gr_input.onchange = function(e) {
  let reader = new FileReader();
  reader.readAsText(gr_input.files[0],"UTF-8");
  reader.onload = function() {
    GR_FILE = reader.result;
    $("#select_gr *").attr("disabled", true);
    $("#select_operation *").attr("disabled", false);
  };
};

var jago_input = document.getElementById("select_dest_jago_btn");
jago_input.onclick = function(e) {
$.post( "/processGraphml", {
    graph: GR_FILE,
    operation: "convertToJago",
  }).done(function() {
    $("#select_operation *").attr("disabled", true);
  });
};


//When selecting the jago index
var jago_add_input = document.getElementById("select_local_add_gr_jago_input");
jago_add_input.onchange = function(e) {
  let reader = new FileReader();
  reader.readAsText(jago_add_input.files[0],"UTF-8");
  reader.onload = function() {
    JAGO_MODEL_INDEX = JSON.parse(reader.result);
    console.log(JAGO_MODEL_INDEX);
    //add the class buttons
    /*
    <div class="btn-group" role="group" aria-label="Basic example">
      <button type="button" class="btn btn-secondary">Left</button>
      <button type="button" class="btn btn-secondary">Middle</button>
      <button type="button" class="btn btn-secondary">Right</button>
    </div>
    */

    var grouped_btns = [];
    var all_btns = {};
    var class_def = {}
    var levels = {}
    if ("class" in JAGO_MODEL_INDEX) {
      var max_tree_length = 0;
      for(class_k in JAGO_MODEL_INDEX["class"]){
        class_def[class_k] = def_class(class_k, JAGO_MODEL_INDEX);
        if (class_def[class_k]["tree"].length > max_tree_length) {
          max_tree_length = class_def[class_k]["tree"].length;
        }
      }
      console.log(class_def);
      _iterate_by_tree(max_tree_length);
      for (var i_level = 1; i_level < max_tree_length + 1; i_level++) {
        levels[i_level] = {}
        for (var i = 0; i < grouped_btns.length; i++) {

          var item_index = grouped_btns[i].length - i_level;
          var father_index = grouped_btns[i].length - i_level + 1;
          var item = grouped_btns[i][grouped_btns[i].length - i_level];
          var father = null;
          if (item != undefined) {
            if (father_index >= 0) {
              father = grouped_btns[i][father_index];
            }
            levels[i_level][item] = {"father":father};
          }
        }
      }
      function _iterate_by_tree(tree_l) {
        if (tree_l == 0) {
          return 1;
        }else {
          for (var class_k in class_def) {
            if(class_def[class_k]["tree"].length == tree_l){
              grouped_btns.push(class_def[class_k]["tree"]);
            }
          }
          _iterate_by_tree(tree_l - 1);
        }
      }
    }

    var jago_add_container = document.getElementById("add_jago_item_container");
    console.log(jago_add_container);
    if (Object.keys(levels).length > 0) {
      var index_html_rows = {}
      for (var i = 1; i < Object.keys(levels).length + 1; i++) {
        for (var k_class in levels[i]) {

          var tr = document.createElement("tr");
          var a_btn = document.createElement("div");
          a_btn.id = k_class;
          a_btn.innerHTML = k_class;
          a_btn.className = "btn btn-secondary";
          var a_random_div = document.createElement("div");
          a_random_div.setAttribute("style","display: inline-block;width:"+((i-1) * 50).toString()+"px");
          tr.appendChild(a_random_div)
          tr.appendChild(a_btn)

          jago_add_container.appendChild(tr);
        }
      }

      jago_add_container.style.display = "table";
    }
  };
};


function def_class(class_name, model_index){

  var class_file = "";
  var class_tree = [];
  var class_object_properties = {};
  var class_data_properties = {};

  var init_class_name = class_name;
  do {
    class_tree.push(init_class_name);
    data_class_obj = model_index["class"][init_class_name];
    //add the relations which are edges and attributes
    class_data_properties = Object.assign({}, class_data_properties, data_class_obj["data_properties"]);
    class_object_properties = Object.assign({}, class_object_properties, data_class_obj[["object_properties"]]);
    init_class_name = data_class_obj["object_properties"][SUBCLASS_KEY];
  } while (init_class_name != undefined);

  for (var i = 1; i < class_tree.length; i++) {
    class_file = class_tree[i].toLowerCase() + "/" + class_file;
  }
  class_file = class_file + class_name.toLowerCase()+".json";

  return {
    "tree": class_tree,
    "data_properties": class_data_properties,
    "object_properties": class_object_properties,
    "file": "src/"+class_file,
    "prefix": data_class_obj["prefix"]
  }
}
