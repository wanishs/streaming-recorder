import {
  Component,
  ElementRef,
  HostListener,
  OnChanges,
  ViewChild,
} from '@angular/core';
import dayGridPlugin from '@fullcalendar/daygrid'; // import day grid plugin
import interactionPlugin from '@fullcalendar/interaction';
import { CalendarOptions } from '@fullcalendar/core';
import { Observable } from 'rxjs/internal/Observable';
import { map, timer } from 'rxjs';
import { openDB } from 'idb';
@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  @ViewChild('video', { static: true })
  videoElement!: ElementRef<HTMLVideoElement>;
  mediaRecorder!: MediaRecorder;
  recordedChunks: any[] = [];
  isRecording = false;
  indexDb = 1;
  currentTime$!: Observable<Date>

  async ngOnInit(): Promise<void> {
    this.currentTime$ = timer(0, 1000).pipe(
      map(() => new Date())
    );
    this.startVideoStream();
  }

  startVideoStream() {
    navigator.mediaDevices
      .getUserMedia({ video: true })
      .then((stream) => {
        this.videoElement.nativeElement.srcObject = stream;
      })
      .catch((error) => {
        console.error('Error accessing the camera: ', error);
      });
  }

  startRecording() {
    const stream = this.videoElement.nativeElement.srcObject as MediaStream;
    this.mediaRecorder = new MediaRecorder(stream);
    this.recordedChunks = [];

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.recordedChunks.push(event.data);
        console.log(this.recordedChunks);
      }
    };

    this.mediaRecorder.onstop = async () => {
      console.log('onstop');

      // Create a Blob from the recorded chunks
      const blob = new Blob(this.recordedChunks, { type: 'video/webm' });
      console.log(blob);

      // Store the Blob in IndexedDB
      await this.storeVideoInIndexedDB(blob);
      console.log('Video saved to IndexedDB');
    };

    this.mediaRecorder.start();
    this.isRecording = true;
  }

  stopRecording() {
    this.mediaRecorder.stop();
    this.isRecording = false;
  }

  async storeVideoInIndexedDB(blob: Blob) {
    // Open the database
    const db = await openDB('video-store', 2, {
      upgrade(db) {
        // Ensure the object store is created without autoIncrement
        if (!db.objectStoreNames.contains('videos')) {
          db.createObjectStore('videos'); // No keyPath or autoIncrement
          console.log("Object store 'videos' created without autoIncrement.");
        }
      },
    });

    // Create a transaction and store the blob
    const tx = db.transaction('videos', 'readwrite');
    const store = tx.objectStore('videos');

    // Generate a unique key (e.g., timestamp) and store the video Blob
    const key = new Date().getTime(); // Use the current timestamp as the key
    const videoData = { blob: blob, timestamp: new Date().toISOString() };
    await store.add(videoData, key); // Provide the key explicitly
    console.log('Video stored successfully with key:', key);
    // Count the number of stored items in the 'videos' object store
    const count = await store.count();
    console.log(`Total stored videos: ${count}`);

    // Complete the transaction
    await tx.done;
  }

  async retrieveVideo() {
    const db = await openDB('video-store', 2);
    const blob = await db.get('videos', 'recorded-video');

    if (blob) {
      const url = URL.createObjectURL(blob);
      this.videoElement.nativeElement.src = url;
      console.log('Video retrieved and playing from IndexedDB');
    } else {
      console.error('No video found in IndexedDB');
    }
  }

  async downloadVideoFromIndexedDB() {
    // Open the IndexedDB database
    const db = await openDB('video-store', 2);
  
    // Start a transaction to read the 'videos' object store
    const tx = db.transaction('videos', 'readonly');
    const store = tx.objectStore('videos');
  
    // Retrieve all data from the 'videos' store
    const allVideos = await store.getAll(); // This returns an array of all the stored videos
  
    // Check if any videos are stored
    if (allVideos.length > 0) {
      console.log('Videos found:', allVideos);
  
      // Loop through all stored videos and download each one
      allVideos.forEach((videoData, index) => {
        if (videoData.blob) {
          // Create a URL for the Blob object
          const videoURL = URL.createObjectURL(videoData.blob);
  
          // Create an anchor element and trigger the download for each video
          const a = document.createElement('a');
          a.href = videoURL;
          a.download = `downloaded-video-${index + 1}.webm`; // Set unique file name for each video
          document.body.appendChild(a);
          a.click(); // Simulate a click to trigger the download
          document.body.removeChild(a); // Remove the anchor element from the DOM
  
          // Revoke the Blob URL to free up memory
          URL.revokeObjectURL(videoURL);
        }
      });
    } else {
      console.log('No videos found in IndexedDB.');
    }
  
    // Complete the transaction
    await tx.done;
  }
  

  async clear() {
    await indexedDB.deleteDatabase('video-store');
    console.log('Database deleted.');
  }
}
