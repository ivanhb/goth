var GR_FILE = null;
var JAGO_MODEL_INDEX = null;
var SUBCLASS_KEY = "@isSubclassOf"


var CLASSES = {}

var INTERFACE_DOM_INDEX = {};

disable_switch(false,true);


//When selecting a graphml file ->
//read and encode it in "UTF-8" and send it to the server
var gr_input = document.getElementById("select_local_gr_input");
gr_input.onchange = function(e) {
  let reader = new FileReader();
  reader.readAsText(gr_input.files[0],"UTF-8");
  reader.onload = function() {
    GR_FILE = reader.result;
    disable_switch(true,false);
  };
};

var jago_input = document.getElementById("select_dest_jago_btn");
jago_input.onclick = function(e) {
    disable_switch(false,false);
    $.post( "/processGraphml", {
        graph: GR_FILE,
        operation: "convertToJago",
      }).done(function() {
        disable_switch(false,true);
    });
};


//When selecting the jago index
var jago_add_input = document.getElementById("select_local_add_gr_jago_input");
jago_add_input.onchange = function(e) {
  function rec_read(files,index) {
    var a_file = files[index];
    if (a_file.name.endsWith(".json")) {
      var reader = new FileReader();
      reader.readAsText(a_file,"UTF-8");
      reader.onload = function() {
        if(a_file.name != "index.json") {
          $.post( "/defgraph", {file_pointer: a_file, a_file: reader.result, fname: a_file.name, fpath: a_file["webkitRelativePath"]}).done(function() {});
        }
        if (index < files.length - 1) {
          return rec_read(files,index+1);
        }else {
          return 1;
        }
      }
    }else {
      return rec_read(files,index+1);
    }
  }

  console.log(jago_add_input);
  console.log(jago_add_input.files);
  rec_read(jago_add_input.files,0,null);
  for (var i = 0; i < jago_add_input.files.length; i++) {
    if (jago_add_input.files[i].name == "index.json"){
      var reader = new FileReader();
      reader.readAsText(jago_add_input.files[i],"UTF-8");
      reader.onload = function() {
        JAGO_MODEL_INDEX = JSON.parse(reader.result);
        console.log(JAGO_MODEL_INDEX);

        var grouped_btns = [];
        var all_btns = {};
        var levels = {}
        if ("class" in JAGO_MODEL_INDEX) {
          var max_tree_length = 0;
          for(class_k in JAGO_MODEL_INDEX["class"]){
            CLASSES[class_k] = def_class(class_k, JAGO_MODEL_INDEX);
            if (CLASSES[class_k]["tree"].length > max_tree_length) {
              max_tree_length = CLASSES[class_k]["tree"].length;
            }
          }
          console.log(CLASSES);
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
              for (var class_k in CLASSES) {
                if(CLASSES[class_k]["tree"].length == tree_l){
                  grouped_btns.push(CLASSES[class_k]["tree"]);
                }
              }
              _iterate_by_tree(tree_l - 1);
            }
          }
        }

        var jago_add_container = document.getElementById("add_jago_item_container");
        if (Object.keys(levels).length > 0) {
          var index_html_rows = {}
          for (var i = 1; i < Object.keys(levels).length + 1; i++) {
            for (var k_class in levels[i]) {

              var tr = document.createElement("tr");
              var a_btn = document.createElement("button");
              a_btn.id = k_class;
              a_btn.innerHTML = k_class;
              a_btn.className = "btn btn-secondary";
              a_btn.onclick = function(e) {
                document.getElementById("inboxes").innerHTML = "";
                //data_properties
                var data_properties = build_html_data_properties(CLASSES[this.id]["data_properties"]);
                //object_properties
                var object_properties = build_html_object_properties(CLASSES[this.id]["object_properties"]);
                //"add" and "cancel"
                var add_btn = build_HTML_elem("Add", "add-class-item");
                var cancel_btn = build_HTML_elem("Cancel", "cancel-add-item");

                document.getElementById("inboxes").appendChild(data_properties);
                document.getElementById("inboxes").appendChild(object_properties);
                document.getElementById("inboxes").appendChild(add_btn.html_elems[0]);
              };

              var a_random_div = document.createElement("div");
              a_random_div.className = "spacin-div";
              a_random_div.setAttribute("style","display: inline-block;width:"+((i-1) * 50).toString()+"px");
              tr.appendChild(a_random_div)
              tr.appendChild(a_btn)

              if (levels[i][k_class]["father"] != null) {
                  a_random_div.className = "spacin-div child-tr";
                  insert_dom_after(tr,document.getElementById(levels[i][k_class]["father"]));
              }else {
                  jago_add_container.appendChild(tr);
              }
            }
          }

          jago_add_container.style.display = "table";
          document.getElementById("add_operation").style.display= "block";

          disable_switch(true,false);

        }
      };
      break;
    }
  }
};


function disable_switch(definition, elaboration){
  $(".section .opt.definition *").attr("disabled", definition);
  $(".section .opt.elaboration *").attr("disabled", elaboration);
}



function build_html_object_properties(atts){

    function _check_server_data() {

    }

    var atts_container = document.createElement("div");
    atts_container.className = "objs-container";
    atts_container.innerHTML = "";

    console.log(atts);
    for (var att in atts) {
      var  obj_prop_class = atts[att];
      if (att != SUBCLASS_KEY) {

        var item_list_dom = null;
        if (obj_prop_class in INTERFACE_DOM_INDEX) {
          if (("pending" in INTERFACE_DOM_INDEX[obj_prop_class]) && (!(INTERFACE_DOM_INDEX[obj_prop_class]["pending"]))) {
            item_list_dom = build_HTML_elem(INTERFACE_DOM_INDEX[obj_prop_class]["data"],"dropdown-list");
          }
        }else {
          INTERFACE_DOM_INDEX[obj_prop_class] = {};
          INTERFACE_DOM_INDEX[obj_prop_class]["pending"] = true;
          INTERFACE_DOM_INDEX[obj_prop_class]["data"] = [];
          INTERFACE_DOM_INDEX[obj_prop_class]["dom_ids"] = new Set();
        }

        //check if this dom was waiting for data
        var set_dom_ids = INTERFACE_DOM_INDEX[obj_prop_class]["dom_ids"]
        var object_prop_id = att.substring(1);
        if (item_list_dom == null) {
          //we don't have any data yet; insert the current id; so once the data arrives this HTML element will be filled
          set_dom_ids.add(object_prop_id);
        }else {
          //we have some data
          if (set_dom_ids.has(object_prop_id)) { set_dom_ids.delete(object_prop_id);}
        }

        //add all to HTML document
        var container = build_HTML_elem({"id":object_prop_id,"elem_class":"btn-group dropright"},"container").html_elems[0];
        var dropdown_btn = build_HTML_elem(object_prop_id,"dropdown-btn").html_elems[0];
        var dropdown_list = build_HTML_elem(INTERFACE_DOM_INDEX[obj_prop_class]["data"],"dropdown-list").html_elems[0];
        container.appendChild(dropdown_btn);
        container.appendChild(dropdown_list);
        atts_container.appendChild(container);


        // call the server and get the list of data
        $.get("/getListItems", { cName: obj_prop_class} )
        .done(function( res ) {
          var res_json = JSON.parse(res);
          console.log(res_json);
          console.log("Data of "+res_json["class"]+" :");
          console.log(res_json["items"]);

          // Is not a pending call anymore:
          // (1) Set "pending" to false; (2) store the data of such class;
          // (3) build the HTML elements of the document elements which needs this class data
          var interface_dom_index = INTERFACE_DOM_INDEX[obj_prop_class];
          interface_dom_index["pending"] = false;
          interface_dom_index["data"].push.apply(interface_dom_index["data"], res_json["items"])

          //build the HTML doms
          var items_in_dropdown = build_HTML_elem(interface_dom_index["data"], "dropdown-list").html_elems[0];
          for (let dom_id of interface_dom_index["dom_ids"]){
            $("#"+dom_id+" .dropdown-menu").html("");
            $("#"+dom_id+" .dropdown-menu").append(items_in_dropdown);
          }
        });
      }
    }
    return atts_container;
}

function build_html_data_properties(atts) {
  var atts_container = document.createElement("div");
  atts_container.className = "atts-container";

  for (var att in atts) {
    var datatype = atts[att];
    var type = "text";
    if (datatype == "string") {
      type = "text";
    }else if (datatype == "int") {
      type = "text";
    }else if (datatype == "url") {
      type = "url";
    }else if (datatype == "datetime") {
      type = "date";
    }

    var att_lbl = document.createElement("div");
    att_lbl.className = "data-property "+type;
    att_lbl.innerHTML = att;

    var input_box = document.createElement("input");
    input_box.type = type;
    input_box.value = "";
    //input_box.className = "datatype "+type;

    var att_container = document.createElement("div");
    att_container.className = "att-container";
    att_container.appendChild(att_lbl);
    att_container.appendChild(input_box);

    atts_container.appendChild(att_container);
  }
  return atts_container;
}

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


// Giving the data and the type of HTML you want to create, this function will return an HTML element
// supported <html_type> are: (1) dropdown-list
function build_HTML_elem(data, html_type) {

  //detect the label to use inside the DOM
  function _detect_lbl(item) {
    var res_lbl = "None";
    if ("data_property" in item) {
      //the att which represent a lbl
      var arr_lbls = ["name","title","value"];
      for (var i = 0; i < arr_lbls.length; i++) {
        if (arr_lbls[i] in item["data_property"]) {
          res_lbl = item["data_property"][arr_lbls[i]];
        }
      }
    }
    return res_lbl;
  }

  var elems = [];
  var id = null;
  //build the HTML element according to the given type
  switch (html_type) {

      case "container":
          var container = document.createElement("div");
          container.id = data.id;
          container.className = data.elem_class;
          elems.push(container);
      break;

      case "dropdown-btn":
          var dropdown_menu_btn = document.createElement("button");
          //dropdown_menu_btn.id = data;
          dropdown_menu_btn.value = data;
          dropdown_menu_btn.className = "btn btn-secondary dropdown-toggle";
          dropdown_menu_btn.innerHTML = data;
          dropdown_menu_btn.setAttribute('data-toggle', 'dropdown');
          dropdown_menu_btn.setAttribute('aria-haspopup', 'true');
          dropdown_menu_btn.setAttribute('aria-expanded', 'false');
          elems.push(dropdown_menu_btn);
      break;

      case "dropdown-list":
        var dropdown_menu_elem = document.createElement("div");
        dropdown_menu_elem.className = "dropdown-menu";
        for (var i = 0; i < data.length; i++) {
          // <a class="dropdown-item" href="#">Action</a>
          var an_a = document.createElement("a");
          an_a.id = data[i]["id"];
          an_a.className = "dropdown-item";
          an_a.innerHTML = _detect_lbl(data[i]);
          dropdown_menu_elem.appendChild(an_a);
        }
        elems.push(dropdown_menu_elem);
      break;

      case "add-class-item":
        //<button type="button" class="btn btn-secondary"/>
        id = "add_class_item";
        var a_btn = document.createElement("button");
        a_btn.id = id;
        a_btn.className = "btn btn-secondary main-opr";
        a_btn.innerHTML = data;
        elems.push(a_btn);
      break;
  }
  return {"id": id, "html_elems":elems};

  // Giving the id and the type of HTML you want to create an event for, this function will define the corresponding event
  // supported <event_type> are: (1) add-class-item
  function _build_HTML_event(elem, event_type){
      switch (event_type) {
        case "add-class-item":
          elem.onclick = function(e) {
              /*
              $.post( "/addJagoItem", {
                }).done(function() {
              });
              */
          };
          document.getElementById("add_jago_item_container").style.display = "none";
          disable_switch(false,false);
          break;
      }
      return 1;
  }
}



//inserts a new node after the <referenceNode>
function insert_dom_after(newNode, referenceNode) {
    referenceNode.parentNode.insertBefore(newNode, referenceNode.nextSibling);
}
