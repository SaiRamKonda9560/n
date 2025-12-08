import socket
import threading
import time
import pyotp
import json
SECRET = "TZZBUC3VQH2SVTCJEGXJL43EQAAEJEQH"
totp = pyotp.TOTP(SECRET)
HOST = "0.0.0.0"
PORT = 9999
def handle_client(conn, addr):
    print(f"[+] Client connected: {addr}")

    start_time = time.time()
    data_received = None
    i=0
    # Wait max 10 seconds for client to send JSON
    while time.time() - start_time < 10:
        conn.settimeout(0.1)
        i=(i+1)
        
        try:
            
            data = conn.recv(1024)
            if data:
                data_received = data.decode().strip()
                break
        except:
            print(i)
            pass

    if data_received is None:
        print(f"[-] {addr} did not send JSON in 10 sec — closing.")
        conn.close()
        return

    try:
        obj = json.loads(data_received)
        timestamp = int(obj["timestamp"])
        code = str(obj["code"])
    except:
        conn.send(b"FORMAT_ERROR")
        conn.close()
        return

    # Verify TOTP using the provided timestamp
    if totp.verify(code, for_time=timestamp, valid_window=1):
        conn.send(b"AUTH_OK")
        print(f"[+] {addr} authenticated successfully.")
    else:
        conn.send(b"AUTH_FAIL")
        print(f"[-] {addr} failed authentication.")

    conn.close()
    print(f"[X] Connection closed: {addr}")
def send_totp_to_server():
    time.sleep(3)
    """Connect to server, send TOTP JSON, and return server response"""
    try:
        client = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        client.connect(("127.0.0.1", PORT))
        print('connected')
        # Generate timestamp and TOTP code
        timestamp = int(time.time())
        code = totp.at(timestamp)
        time.sleep(8)
        # Prepare JSON payload
        payload = {"timestamp": timestamp, "code": code}
        client.send(json.dumps(payload).encode())
        print('data sent')

        # Receive server response
        response = client.recv(1024).decode()
        client.close()
        return response

    except Exception as e:
        print("Error:", e)
        return None
# MAIN SERVER
server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
server.bind((HOST, PORT))
server.listen(5)
threading.Thread(target=send_totp_to_server).start()
print(f"[SERVER] Running on {HOST}:{PORT}")
while True:
    conn, addr = server.accept()
    print(f"clint connect")
    threading.Thread(target=handle_client, args=(conn, addr), daemon=True).start()
