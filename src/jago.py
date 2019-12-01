import json
import os

class Jago(object):

    model_index = {}
    class_index = {}

    def __init__(self, jago_model_path = None):
        try:
            if jago_model_path != None:
                #the model index first
                with open(jago_model_path+"/"+"index.json") as json_file:
                    self.model_index = json.load(json_file)

                #a map to all json files
                for root, dirs, files in os.walk(jago_model_path+"/src"):
                    for file in files:
                        if file.endswith(".json"):
                            self.class_index[file.split(".json")[0].capitalize()] = os.path.join(root, file)
        except:
            return False

    #The following two methods are used if <jago_model_path> was not specified during initialization
    def def_model_index(self, json_file):
        self.model_index = json.load(json_file)
    def def_class_index(self, json_file, class_name):
        self.class_index[class_name] = json_file

    def add_item(self, class_name, data_properties, object_properties):
        class_file = None
        with open(self.class_index[class_name]) as json_file:
            class_file = json.load(json_file)

            id_set = set(list(range(1, len(class_file["items"]) +1)))
            for item in class_file["items"]:
                if int(item["id"]) in id_set:
                    id_set.remove(int(item["id"]))

            an_id = None
            for aval_id in id_set:
                an_id = str(aval_id)
                break
            if an_id == None:
                an_id = str(len(class_file["items"])+1)

            class_file["items"].append({
                    "id": str(an_id),
                    "data_properties": data_properties,
                    "object_properties": object_properties
            })

        if class_file != None:
            with open(self.class_index[class_name], 'w') as f_src:
                json.dump(class_file, f_src)

        return True
