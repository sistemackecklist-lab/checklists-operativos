<script type="module">
  // Import the functions you need from the SDKs you need
  import { initializeApp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";
  import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-analytics.js";
  // TODO: Add SDKs for Firebase products that you want to use
  // https://firebase.google.com/docs/web/setup#available-libraries

  // Your web app's Firebase configuration
  // For Firebase JS SDK v7.20.0 and later, measurementId is optional
  const firebaseConfig = {
    apiKey: "AIzaSyBS9fY8txtO_TFhlhhTj4KfImCUu65cLJo",
    authDomain: "checklists-operativos.firebaseapp.com",
    projectId: "checklists-operativos",
    storageBucket: "checklists-operativos.firebasestorage.app",
    messagingSenderId: "795436931731",
    appId: "1:795436931731:web:16eadab3691af027eacb66",
    measurementId: "G-H9YQ9B0ZXC"
  };

  // Initialize Firebase
  const app = initializeApp(firebaseConfig);
  const analytics = getAnalytics(app);
</script>