import { Component, ElementRef, ViewChild } from '@angular/core';
import dayGridPlugin from '@fullcalendar/daygrid'; // import day grid plugin
import interactionPlugin from '@fullcalendar/interaction'; 
import { CalendarOptions } from '@fullcalendar/core'; 
@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {

  // webcam
  @ViewChild('recordedVideo') recordVideoElementRef! : ElementRef;  // recordedVideo is assigned to DOM Element recordVideoElementRef
  @ViewChild('video') videoElementRef!: ElementRef; // video is assigned to DOM Element videoElementRef

  videoResponse: any; // Cam Started or not
  stream : any;
  videoElement!: HTMLVideoElement;
  recordVideoElement!: HTMLVideoElement;
  mediaRecorder: any;
  recordedBlobs!: Blob[];
  isRecording: boolean = false;
  videoUrl : any;
  showCam = false;
  showVideos = false;

  // calendar
  events: any[] = [];
  selectedEvent: any = null;

  videoQualityOptions = [
    { label: '360p', width: 640, height: 360 },
    { label: '480p', width: 854, height: 480 },
    { label: '720p', width: 1280, height: 720 },
    { label: '1080p', width: 1920, height: 1080 },
  ];

  selectedQuality: any = this.videoQualityOptions[0];

  calendarOptions: CalendarOptions = {
    plugins: [dayGridPlugin, interactionPlugin], // Add plugins
    initialView: 'dayGridMonth', // View
    editable: true, // Allow event editing
    selectable: true, // Allow date selection
    events: this.events, // Predefined events
    eventClick: this.handleEventClick.bind(this), // Event click handler
    dateClick: this.handleDateClick.bind(this) // Date click handler
  };

  constructor() {
    this.events = [
      { title: 'Event 1', date: '2024-09-09' },
      { title: 'Event 2', date: '2024-09-10' }
    ];
    this.calendarOptions.events = [...this.events];
  }

  ngOnInit(){
    this.videoResponse = document.getElementById('videoStream');
  }

  getCam(){
    this.showCam=true;
    navigator.mediaDevices.getUserMedia({video:{width:500, height:500}, audio:true})
    .then((response)=>{
      this.stream = response;
      console.log("Video Response",response);
      this.videoElement = this.videoElementRef.nativeElement;
      this.recordVideoElement = this.recordVideoElementRef.nativeElement;
      
      this.videoElement.srcObject = response;
      this.videoResponse.srcObject = response;
      }
    ).catch(err=> console.log("Error has occured"));
  }

  async start() {
    // Reset recorded blobs
    this.recordedBlobs = [];

    // Get stream with selected resolution
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { exact: this.selectedQuality.width },
          height: { exact: this.selectedQuality.height }
        },
        audio: true // Include audio if needed
      });

      // Create a new MediaRecorder with mp4 MIME type (or other supported format)
      let mediaRecorderOptions: any = { mimeType: 'video/webm; codecs=vp8' }; // mp4 not fully supported in all browsers
      this.mediaRecorder = new MediaRecorder(this.stream, mediaRecorderOptions);
      this.mediaRecorder.start();
      this.isRecording = true;

      console.log('MediaRecorder state:', this.mediaRecorder.state);

      // Handle data available
      this.mediaRecorder.ondataavailable = (event: any) => {
        if (event.data && event.data.size > 0) {
          this.recordedBlobs.push(event.data);
        }
      };

      // Handle stop event
      this.mediaRecorder.onstop = (event: any) => {
        const videoBuffer = new Blob(this.recordedBlobs, { type: 'video/webm' }); // Save in webm format
        this.videoUrl = window.URL.createObjectURL(videoBuffer);
        this.recordVideoElement.src = this.videoUrl;
      };

    } catch (error) {
      console.error('Error accessing media devices.', error);
    }
  }

  stop(){
    this.mediaRecorder.stop();
    this.isRecording = !this.isRecording;
    this.showVideos=!this.showVideos;
  }

  changeQuality(selectedQuality: any) {
    this.selectedQuality = selectedQuality;
    if (this.isRecording) {
      this.stop();
      this.start(); // Restart recording with new resolution
    }
  }

  // calendar
  handleDateClick(arg: any) {
    const title = prompt('Enter Event Title');
    if (title) {
      const newEvent = { title: title, date: arg.dateStr };
      this.events.push(newEvent);
      this.calendarOptions.events = [...this.events]; // Refresh events
    }
  }

  handleEventClick(arg: any) {
    this.selectedEvent = arg.event;
    const edit = confirm('Do you want to edit this event?');
    if (edit) {
      const newTitle = prompt('Edit Event Title', this.selectedEvent.title);
      if (newTitle) {
        this.selectedEvent.setProp('title', newTitle); // Edit event title
      }
    } else {
      const del = confirm('Do you want to delete this event?');
      if (del) {
        this.selectedEvent.remove(); // Remove event
        this.events = this.events.filter((event) => event !== this.selectedEvent);
      }
    }
  }
}
