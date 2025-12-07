import os 
from flask import Flask, send_from_directory, jsonify
app = Flask(__name__)
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
@app.route("/")
def home():
    return "Local File Server Running!"
# -----------------------------
# LIST FILES IN CURRENT FOLDER
# -----------------------------
@app.route("/list", methods=["GET"])
def list_files():
    files = [f for f in os.listdir(BASE_DIR) if os.path.isfile(os.path.join(BASE_DIR, f))]
    return jsonify({"files": files})
# -----------------------------
# GET FILE FROM CURRENT FOLDER
# -----------------------------
@app.route("/files/<path:filename>", methods=["GET"])
def get_file(filename):
    try:
        return send_from_directory(BASE_DIR, filename, as_attachment=False)
    except FileNotFoundError:
        return jsonify({"error": "File not found"}), 404
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
