import { useEffect, useState } from 'react';
import './EmailExtractor.css';

const CLIENT_ID = '233852782558-clap8gucqoj6a38ltesa6tbiq1dsc82c.apps.googleusercontent.com';
const API_KEY = 'AIzaSyAdH_NTi6u23cwiDpPbJKWdSxP_GbD3rIc';
const DISCOVERY_DOCS = ['https://www.googleapis.com/discovery/v1/apis/gmail/v1/rest'];
const SCOPES = 'https://www.googleapis.com/auth/gmail.readonly';

export default function EmailExtractor() {
  const [emails, setEmails] = useState([]);
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadGapi = async () => {
      await new Promise((resolve) => {
        const script = document.createElement('script');
        script.src = 'https://apis.google.com/js/api.js';
        script.onload = resolve;
        document.head.appendChild(script);
      });

      window.gapi.load('client', async () => {
        await window.gapi.client.init({ apiKey: API_KEY });
        window.google.accounts.oauth2.initTokenClient({
          client_id: CLIENT_ID,
          scope: SCOPES,
          callback: (tokenResponse) => {
            if (tokenResponse.error) setError(tokenResponse.error);
          }
        });
      });
    };

    loadGapi();
  }, []);

  const handleAuthClick = async () => {
    setLoading(true);
    try {
      const token = await window.google.accounts.oauth2.initTokenClient({ 
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: () => {}
      }).requestAccessToken();
      
      if (token) await listEmails();
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  const listEmails = async () => {
    try {
      const res = await window.gapi.client.gmail.users.messages.list({
        userId: 'me',
        maxResults: 10
      });
      
      const messages = await Promise.all(res.result.messages.map(async (msg) => {
        const emailRes = await window.gapi.client.gmail.users.messages.get({
          userId: 'me',
          id: msg.id
        });
        return processEmailData(emailRes.result);
      }));

      setEmails(messages);
    } catch (err) {
      setError(err.message);
    }
  };

  const processEmailData = (email) => {
    const headers = email.payload.headers;
    const fromHeader = headers.find(h => h.name === 'From').value;
    let from = fromHeader;
    if (from.includes('<')) {
      from = from.split('<')[0].trim().replace(/"/g, '');
    }
  
    return {
      id: email.id,
      from,
      subject: headers.find(h => h.name === 'Subject')?.value || '(No Subject)',
      date: new Date(parseInt(email.internalDate)),
      snippet: email.snippet,
      body: getEmailBody(email.payload),
      to: headers.find(h => h.name === 'To')?.value || ''
    };
  };
  
  const getEmailBody = (payload) => {
    if (payload.parts) {
      const htmlPart = payload.parts.find(p => p.mimeType === 'text/html');
      const textPart = payload.parts.find(p => p.mimeType === 'text/plain');
      return htmlPart ? decodeEmailBody(htmlPart.body.data) 
        : textPart ? decodeEmailBody(textPart.body.data) 
        : 'No content available';
    }
    return decodeEmailBody(payload.body.data);
  };
  
  const decodeEmailBody = (data) => {
    return decodeURIComponent(escape(atob(data.replace(/-/g, '+').replace(/_/g, '/'))));
  };

  return (
    <div className="email-extractor-container">
      <button 
        className="gmail-auth-btn"
        onClick={handleAuthClick}
        disabled={loading}
      >
        <img src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjUyIDQyIDg4IDY2Ij4KPHBhdGggZmlsbD0iI0U0RTRFNCIgZD0iTTU4IDEwOGg3MmM1IDAgNy0xIDctN3YtNTNjMC01LTItNy03LTdoLTcyYy01IDAtNyAyLTcgN3Y1M2MwIDYgMiA3IDcgN3oiLz4KPHBhdGggZmlsbD0iI0QwRDBEMCIgZD0iTTU4IDEwOGg3MmM1IDAgNy0xIDctN3YtNTNjMC01LTItNy03LTdoLTcyYy01IDAtNyAyLTcgN3Y1M2MwIDYgMiA3IDcgN3oiLz4KPHBhdGggZmlsbD0iI0VBNDMzNSIgZD0iTTU4IDQyaDcydjIwbC05IDE1LTE4IDgtMTgtOC05LTE1eiIvPgo8cGF0aCBmaWxsPSIjMEYwRjBGIiBmaWxsLW9wYWNpdHk9IjAuMDgiIGQ9Ik01OCA0MmgxLjVsNzMuNSAzM2MtMS0yLjgtMy00LTYtNGgtNjhjLTIgMC00IDItNiA0eiIvPgo8cGF0aCBmaWxsPSIjRjZGNkY2IiBkPSJNMTMwIDEwMWgtNzJjLTUgMC03LTItNy03djRjMCA1IDIgNyA3IDdoNzJjNSAwIDctMiA3LTd2LTRjMCA1LTIgNy03IDd6Ii8+CjxwYXRoIGZpbGw9IiNGRkZGRkYiIGQ9Ik01OCA0Mmg3MmM1IDAgNyAyIDcgN3YtNGMwLTUtMi03LTctN2gtNzJjLTUgMC03IDItNyA3djRjMC01IDItNyA3LTd6Ii8+CjxnIGZpbGw9IiNFQTQzMzUiPgo8cGF0aCBkPSJNMTI1LjUgNTguNWwtOSAxNC41LTQ4LTI5LjVoMTYuNXoiLz4KPHBhdGggZD0iTTEzMS4yIDYwLjJsLTktMTguMnY0bDktMTQuNWM0LjIgMS44IDYuMyA0LjMgNi4zIDcuNXY1YzAgLTEuMiAwLTIgMC0yLjUgLTAuNyA4LjctMyAxNS02LjMgMTguN3oiLz4KPHBhdGggZD0iTTUxLjggMTAxLjhjLTAuMyAtMSAtMC41IC0yLjIgLTAuNSAtMy4zdi01M2MwIC0zLjIgMi4xIC01LjggNi4zIC03LjVsOSAxNC41di00bC05IDE4LjJjLTMuMyAtMy43IC01LjYgLTEwIC02LjMgLTE4LjcgMCAtMC41IDAgLTEuMyAwIC0yLjV2NTNjMCA0LjIgMi4xIDYuOCA2LjMgOC41eiIvPgo8L2c+CjxwYXRoIGZpbGw9IiNGRkZGRkYiIGQ9Ik02My41IDU0LjVsMzggMjMgMTYuNSAtMTAtNTYgLTM0LjV6Ii8+CjxwYXRoIGZpbGw9IiNGMUYxRjEiIGQ9Ik03OC41IDM2LjVsLTE1IDE4IDU2IDM0LjV2LTl6Ii8+CjxwYXRoIGZpbGw9IiNEMEYwRDAiIGQ9Ik02OS4yIDQ1LjhsNDkuMyAzMHY0MC40YzAgMS4xIC0wLjIgMi4zIC0wLjUgMy4zaC0wLjRsNDguOSAtNDQuOHYtNDcuNmgtMC41bC05Ny4zIDU5LjZ2LTQwLjl6Ii8+CjxnPgo8cGF0aCBmaWxsPSIjRUE0MzM1IiBkPSJNMTA0LjUgODloLTMzbDMzIC0yeiIvPgo8cGF0aCBmaWxsPSIjMEYwRjBGIiBmaWxsLW9wYWNpdHk9IjAuMiIgZD0iTTcxLjUgODlsMzMgLTIwdjE3eiIvPgo8L2c+Cjwvc3ZnPiA=" alt="Gmail" />
        Sign in with Gmail
      </button>

      {loading && (
        <div className="loading-indicator">
          <div className="spinner"></div>
        </div>
      )}

      {error && <div className="error-message">{error}</div>}

      {!loading && emails.length > 0 && (
        <div className="email-list">
          {emails.map((email) => (
            <div 
              key={email.id}
              className="email-card"
              onClick={() => setSelectedEmail(email)}
            >
              <div className="email-header">
                <div className="email-sender">{email.from}</div>
                <div className="email-date">
                  {email.date.toLocaleDateString()}
                </div>
              </div>
              <div className="email-subject">{email.subject}</div>
              <div className="email-snippet">{email.snippet}</div>
            </div>
          ))}
        </div>
      )}

      {selectedEmail && (
        <div className="email-detail">
          <button className="back-button" onClick={() => setSelectedEmail(null)}>
            Back to emails
          </button>
          <h2>{selectedEmail.subject}</h2>
          <div className="email-header">
            <div className="email-sender">From: {selectedEmail.from}</div>
            <div className="email-date">
              {selectedEmail.date.toLocaleString()}
            </div>
          </div>
          <div className="email-to">To: {selectedEmail.to}</div>
          <div 
            className="email-body" 
            dangerouslySetInnerHTML={{ __html: selectedEmail.body }} 
          />
        </div>
      )}
    </div>
  );
}