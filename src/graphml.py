from bs4 import BeautifulSoup
import codecs
import os
import json

class Graphml(object):

    OBJECT_PROP_KEY = "@"
    SUBCLASS_KEY = "@isSubclassOf"
    DATATYPES = {
        "string":{"default":"string"},
        "int":{"default":"int"},
        "datetime":{"default":"datetime"},
        "url":{"default":"url"}
    }

    def __init__(self, input, is_path = True):
        self.nodes = []
        self.edges = []

        if is_path:
            with codecs.open(input, 'r', encoding='utf8') as f:
                self.raw = f.read()
                self.soup = BeautifulSoup(self.raw, features="html.parser")
        else:
            self.raw = input
            self.soup = BeautifulSoup(input, features="html.parser")

    def get_edges(self):
        res = []
        edges = self.find_all("edge",{})
        for e in edges:
            bs_e = BeautifulSoup(str(e),features="html.parser")
            res.append({
                "id": bs_e.find("edge")["id"],
                "source": bs_e.find("edge")["source"],
                "target": bs_e.find("edge")["target"],
                "value": bs_e.find("y:edgelabel").contents
            })

        for i in range(0,len(res)):
            str_on_edge = res[i]["value"][0].split(",")[0]
            res[i]["value"] = str_on_edge.replace("\n",";")
        return res

    def get_nodes(self):
        res = []
        nodes = self.find_all("node",{})
        for n in nodes:
            bs_n = BeautifulSoup(str(n),features="html.parser")
            res.append({
                "id": bs_n.find("node")["id"],
                "value": "".join(bs_n.find("y:nodelabel").contents)
            })
        return res

    def find_all(self,tag,att):
        return self.soup.findAll(tag,att)


    def normalize_into_owl_formalism(self):
        OWL_GRAPH = {
            "classes": [],
            "datatypes": [],
            "data_properties": [],
            "object_properties": []
        }

        self.nodes = self.get_nodes()
        self.edges = self.get_edges()

        #Classes and Datatypes
        for n in self.nodes:
            if(n["value"][0].isupper()):
                OWL_GRAPH["classes"].append(n)
            else:
                OWL_GRAPH["datatypes"].append(n)

        # Object/Data properties
        obj_props = []
        data_props = []
        for e in self.edges:
            edge_type = "dataProp"
            if(e["value"][0] == self.OBJECT_PROP_KEY):
                edge_type = "objProp"

            e["value"] = e["value"].split(";")
            if edge_type == "dataProp":
                OWL_GRAPH["data_properties"].append(e)
            elif edge_type == "objProp":
                OWL_GRAPH["object_properties"].append(e)

        return OWL_GRAPH


    # JSON Jago index,
    def build_jago_index(self,owl_gr, path = None):

        def _find_elem(items_list,att,val):
            for item in items_list:
                if item[att] == val:
                    return item
            return -1

        def _build_tree(classes_index, class_val, tree):
            if self.SUBCLASS_KEY in classes_index[class_val]["object_properties"]:
                sub_class_val = classes_index[class_val]["object_properties"][self.SUBCLASS_KEY]
                tree.append(sub_class_val)
                return _build_tree(classes_index, sub_class_val, tree)
            else:
                return tree


        index_prefixes = {}
        classes_index = {}
        for c in owl_gr["classes"]:
            classes_index[c["value"]]= {
                "prefix":None,
                "last_id": 0,
                "data_properties": {},
                "object_properties": {}
            }
            #check data properties
            for dp in owl_gr["data_properties"]:
                    if (dp["source"] == c["id"]):
                        for dp_val in dp["value"]:
                            default_value = -1
                            target_dp_node = _find_elem(owl_gr["datatypes"],"id",dp["target"])
                            if target_dp_node != -1:
                                if target_dp_node["value"] in self.DATATYPES:
                                    default_value = self.DATATYPES[target_dp_node["value"]]["default"]
                            classes_index[c["value"]]["data_properties"][dp_val] = default_value

            #check object properties
            for op in owl_gr["object_properties"]:
                    if (op["source"] == c["id"]):
                        for op_val in op["value"]:
                            target_node = _find_elem(owl_gr["classes"],"id",op["target"])
                            classes_index[c["value"]]["object_properties"][op_val] = target_node["value"]

            #define prefix
            pref = c["value"][:2].lower()
            i = 2
            while (pref in index_prefixes):
                pref = pref+c["value"][i].lower()
                i += 1
            index_prefixes[pref] = True
            classes_index[c["value"]]["prefix"] = pref

        #in case a path where to build the structure is specified
        if path != None:
            #a local dir
            if not path.startswith("http"):
                model_path = path+"model/"
                if not os.path.exists(os.path.dirname(model_path)):
                    os.makedirs(model_path)

                #save the index.json
                with open(model_path+'index.json', 'w') as f:
                    data = {"class": classes_index}
                    json.dump(data, f)

                #now all the structure
                src_path = path+"model/src"
                for class_k in classes_index:
                    tree = _build_tree(classes_index, class_k, [class_k])
                    i = len(tree) - 1
                    new_path = "";
                    while i >= 1:
                        new_path = new_path + "/"+tree[i].lower()
                        i -= 1
                    new_path = src_path+new_path+"/"+ tree[0].lower()+".json"

                    #create dirs and file
                    if not os.path.exists(os.path.dirname(new_path)):
                        os.makedirs(os.path.dirname(new_path))

                    with open(new_path, 'w') as f_src:
                        json.dump({"class":tree[0],"items":[]}, f_src)

        return classes_index
