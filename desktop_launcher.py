import threading
import webview
import subprocess

def run_streamlit():
    # Explicitly bind Streamlit to localhost and port 8501
    subprocess.Popen(["streamlit", "run", "app.py", "--server.address=127.0.0.1", "--server.port=8501"])

if __name__ == '__main__':
    # Start Streamlit in a separate thread
    threading.Thread(target=run_streamlit).start()
    
    # Create a webview window pointing to the Streamlit app
    webview.create_window("Volcano Dashboard", "http://127.0.0.1:8501", width=1280, height=800)
    webview.start()