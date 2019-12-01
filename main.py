import json
from ast import literal_eval
import requests
import re
import sys
import csv
import os, shutil
import time
from os.path import basename
from shutil import copyfile
import zipfile
from threading import Timer
from flask import Flask, render_template, request, json, jsonify, redirect, url_for, send_file, after_this_request
import webbrowser

from src.graphml import Graphml
from src.jago import Jago

#cache.clear()
app = Flask(__name__)
#app.config['DEBUG'] = True
#app.debug = True
app.config.update(
    SEND_FILE_MAX_AGE_DEFAULT=True
)

SCRIPT_PATH = "."
if (len(sys.argv) > 1):
    SCRIPT_PATH = str(sys.argv[1])

#For the "convert" functions
a_Graphml = None

#For the "add" functions
a_Graph = {}


@app.route('/shutdown')
def shutdown():
    func = request.environ.get('werkzeug.server.shutdown')
    if func is None:
        raise RuntimeError('Not running with the Werkzeug Server')
    func()
    return 'Server shutting down...'

@app.route('/status')
def status():
    return "Online\n"

@app.route('/')
def index():
    return render_template('index.html')


@app.route('/processGraphml',methods = ['POST'])
def process_graphml():

    def convert_to_jago():
        owl_form = a_Graphml.normalize_into_owl_formalism()
        a_Graphml.build_jago_index(owl_form,"")

    graph = request.form['graph']
    operation = request.form['operation']
    a_Graphml = Graphml(graph,False)

    if operation == "convertToJago":
        convert_to_jago()
        return "Init successfully!"
    else:
        return "No such operation!"

@app.route('/defgraph', methods = ['POST'])
def graph_def():
    print(request.form['file_pointer'])
    a_f_name = request.form['fname'];
    a_f_path = request.form['fpath'];

    a_json = literal_eval(request.form['a_file']);
    class_name = a_json["class"];
    class_items = a_json["items"];
    if class_name not in a_Graph:
        a_Graph[class_name] = {"files":{}}
    a_Graph[class_name]["files"][a_f_path] = class_items

    return "Graph defined"

@app.route('/getListItems')
def get_list_items():
    a_c_name = request.args.get('cName')

    res_obj = {"class": a_c_name, "items": []}
    if a_c_name in a_Graph:
        for f in a_Graph[a_c_name]["files"]:
            f_items = a_Graph[a_c_name]["files"][f]
            for item_obj in f_items:
                #TODO: is better to return a specific value which represents the Label
                res_obj["items"].append(item_obj)

    print(res_obj)

    return json.dumps(res_obj)

@app.route('/addJagoItem')
def add_jago_item():
    a_Jago = Jago()
    for a_class_name in a_Graph:
        a_Jago.def_class_index()


def open_browser():
    dipam_url = "http://127.0.0.1:5000/"
    browser_path = [
        "chrome",
        "google-chrome",
        "chromium",
        "chromium-browser",
        'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe %s'
    ]

    def rec_open(url,index):
        if index >= len(browser_path):
            return False

        try:
            browse = webbrowser.get(browser_path[index]).open(dipam_url)
        except Exception as e:
            browse = False
        if not browse:
            rec_open(url,index + 1)
        else:
            return True

        return True

    def search_chrome_in_windows(a_root):
        dir_path = os.path.dirname(a_root)
        for root, dirs, files in os.walk(dir_path):
            for file in files:
                if file.startswith('chrome.exe'):
                    return root+'/'+str(file)
        return False

    if not rec_open(dipam_url,0):
        system_root = os.path.abspath(os.sep)
        if(system_root != "/"):
            browser_path_win = search_chrome_in_windows(system_root)
            if browser_path_win != False:
                webbrowser.get(browser_path_win+" %s").open(dipam_url)
                return(browser_path_win)

        webbrowser.open(dipam_url)
        return("Default browser")

def find_file(file, path):
    for root, dirs, files in os.walk(path):
        for name in files:
            if file["name"] == name:
                full_path = os.path.join(root, name)
                #the size of the file
                file_size = os.path.getsize(full_path)
                #time of the last modification
                file_mtime = str(os.path.getmtime(full_path)).replace(".","")

                if (file_size == file["size"]) and (file["lastModified"] in file_mtime):
                    return full_path;

    return -1


if __name__ == '__main__':
    #Timer(1, open_browser).start();
    app.run()
