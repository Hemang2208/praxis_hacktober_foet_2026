import axios from 'axios';

export async function submitpull_request({ title, description, user_id, status }) {
  try {
    const response = await axios.post('/api/pull-request', {
      title,
      description,
      user_id,
      status,
    });
    return response.data;
  } catch (error) {
    return { success: false, error: error.message };
  }
}
