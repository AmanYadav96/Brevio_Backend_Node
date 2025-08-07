// Test script to verify creator content API returns likes count and saved status
import fetch from 'node-fetch';

const API_BASE_URL = 'http://localhost:3000/api';

// Test function to check creator content API
async function testCreatorContentAPI() {
  try {
    console.log('Testing Creator Content API...');
    
    // Test GET /api/creator-content (without authentication)
    const response = await fetch(`${API_BASE_URL}/creator-content?limit=1`);
    const data = await response.json();
    
    if (data.success && data.content && data.content.length > 0) {
      const firstContent = data.content[0];
      
      console.log('✅ API Response Structure:');
      console.log('- Content ID:', firstContent._id);
      console.log('- Title:', firstContent.title);
      console.log('- Likes Count:', firstContent.likesCount);
      console.log('- User Liked:', firstContent.userLiked);
      console.log('- User Saved:', firstContent.userSaved);
      console.log('- Saved Folder:', firstContent.savedFolder);
      
      // Check if new fields exist
      const hasNewFields = [
        'likesCount',
        'userLiked', 
        'userSaved',
        'savedFolder'
      ].every(field => firstContent.hasOwnProperty(field));
      
      if (hasNewFields) {
        console.log('\n🎉 SUCCESS: All new fields are present in the API response!');
        console.log('✅ likesCount: ', typeof firstContent.likesCount, '(should be number)');
        console.log('✅ userLiked: ', typeof firstContent.userLiked, '(should be boolean)');
        console.log('✅ userSaved: ', typeof firstContent.userSaved, '(should be boolean)');
        console.log('✅ savedFolder: ', typeof firstContent.savedFolder, '(should be string or null)');
      } else {
        console.log('\n❌ FAILED: Some new fields are missing from the API response');
      }
    } else {
      console.log('❌ No content found in API response');
    }
    
  } catch (error) {
    console.error('❌ Error testing API:', error.message);
  }
}

// Run the test
testCreatorContentAPI();