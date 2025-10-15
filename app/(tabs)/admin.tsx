import admin from 'firebase-admin';

const message = {
  token: 'USER_FCM_TOKEN_HERE',
  notification: {
    title: 'Hello!',
    body: 'This is a targeted notification.'
  }
};

admin.messaging().send(message)
  .then(response => console.log('Message sent:', response))
  .catch(error => console.log('Error sending message:', error));
