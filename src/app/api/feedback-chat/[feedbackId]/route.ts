import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import dbConnect from "@/lib/dbConnect";
import FeedbackChat from "@/models/FeedbackChat";
import AIFeedback from "@/models/AIFeedback";
import { getCurrentUser } from "@/lib/auth";

// GET /api/feedback-chat/[feedbackId] - Get chat history for a feedback
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ feedbackId: string }> }
) {
  try {
    await dbConnect();
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { feedbackId } = await params;
    
    // Validate feedbackId
    if (!Types.ObjectId.isValid(feedbackId)) {
      return NextResponse.json({ error: "Invalid feedback ID" }, { status: 400 });
    }

    // Verify the feedback belongs to this student
    const feedback = await AIFeedback.findOne({ 
      _id: feedbackId, 
      user_id: user._id 
    });
    
    if (!feedback) {
      return NextResponse.json({ error: "Feedback not found" }, { status: 404 });
    }

    // Get or create chat
    let chat = await FeedbackChat.findOne({ 
      feedbackId: feedbackId, 
      user_id: user._id 
    });
    
    if (!chat) {
      chat = await FeedbackChat.create({
        feedbackId: feedbackId,
        task_id: feedback.task_id,
        user_id: user._id,
        messages: [],
        isActive: true
      });
    }

    return NextResponse.json({
      success: true,
      chat: {
        _id: chat._id,
        feedbackId: chat.feedbackId,
        task_id: chat.task_id,
        messages: chat.getRecentMessages(100), // Get last 100 messages
        lastActivity: chat.lastActivity
      }
    });

  } catch (error) {
    console.error('Error fetching feedback chat:', error);
    return NextResponse.json(
      { error: "Internal server error" }, 
      { status: 500 }
    );
  }
}

// POST /api/feedback-chat/[feedbackId] - Send a new message
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ feedbackId: string }> }
) {
  try {
    await dbConnect();
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { feedbackId } = await params;
    const { message } = await request.json();
    
    // Validate input
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    if (message.length > 5000) {
      return NextResponse.json({ error: "Message too long" }, { status: 400 });
    }

    // Validate feedbackId
    if (!Types.ObjectId.isValid(feedbackId)) {
      return NextResponse.json({ error: "Invalid feedback ID" }, { status: 400 });
    }

    // Verify the feedback belongs to this student
    const feedback = await AIFeedback.findOne({ 
      _id: feedbackId, 
      user_id: user._id 
    });
    
    if (!feedback) {
      return NextResponse.json({ error: "Feedback not found" }, { status: 404 });
    }

    // Get or create chat
    let chat = await FeedbackChat.findOne({ 
      feedbackId: feedbackId, 
      user_id: user._id 
    });
    
    if (!chat) {
      chat = await FeedbackChat.create({
        feedbackId: feedbackId,
        task_id: feedback.task_id,
        user_id: user._id,
        messages: [],
        isActive: true
      });
    }

    // Add student message
    await chat.addMessage("student", message.trim());

    // Generate AI response
    const aiResponse = await generateAIResponse(message);
    
    if (aiResponse) {
      await chat.addMessage("ai", aiResponse);
    }

    return NextResponse.json({
      success: true,
      message: "Message sent successfully",
      chat: {
        _id: chat._id,
        messages: chat.getRecentMessages(10) // Return recent messages including the new ones
      }
    });

  } catch (error) {
    console.error('Error sending message:', error);
    return NextResponse.json(
      { error: "Internal server error" }, 
      { status: 500 }
    );
  }
}

// Helper function to generate AI response
async function generateAIResponse(
  studentMessage: string
): Promise<string | null> {
  try {
    // This is a simplified AI response - in production, you'd integrate with OpenAI/GPT
    const aiResponse = await callAIService();
    
    return aiResponse || generateFallbackResponse(studentMessage);
    
  } catch (error) {
    console.error('Error generating AI response:', error);
    return generateFallbackResponse(studentMessage);
  }
}

// Build context for AI service (for future use)
/*
function buildContextForAI(studentMessage: string, feedback: IAIFeedback, chat: IFeedbackChat): string {
  const recentMessages = chat.getRecentMessages(10);
  const chatHistory = recentMessages
    .map((msg: ChatMessage) => `${msg.role === 'student' ? 'Student' : 'AI'}: ${msg.content}`)
    .join('\n');

  return `
You are an AI coding mentor helping a student understand their code review feedback.

Original Feedback Context:
- Task: Code review feedback for a programming task
- Overall Assessment Score: ${feedback.assessment?.overall || 'N/A'}/100
- Code Quality: ${feedback.assessment?.codeQuality || 'N/A'}/100
- Summary: ${feedback.summary || 'No summary available'}
- Key Strengths: ${feedback.strengths?.join(', ') || 'None listed'}
- Areas for Improvement: ${feedback.improvements?.join(', ') || 'None listed'}
- Total Issues Found: ${feedback.totalIssues || 0}

Recent Chat History:
${chatHistory}

Current Student Question: ${studentMessage}

Please provide a helpful, educational response that:
1. Directly addresses the student's question
2. References specific aspects of their code feedback when relevant
3. Provides clear explanations and examples
4. Encourages learning and improvement
5. Keeps the response concise but informative (under 500 words)

Response:`;
}
*/

// Placeholder for AI service integration - replace with actual AI service
async function callAIService(): Promise<string | null> {
  // In production, integrate with OpenAI API or similar
  // For now, return null to use fallback response
  return null;
}

// Generate fallback response when AI service is unavailable
function generateFallbackResponse(studentMessage: string): string {
  const lowerMessage = studentMessage.toLowerCase();
  
  if (lowerMessage.includes('why') || lowerMessage.includes('explain')) {
    return "I'd be happy to explain! Could you please be more specific about which part of the feedback you'd like me to clarify? For example, you could ask about a specific code comment, assessment score, or recommendation.";
  }
  
  if (lowerMessage.includes('how') || lowerMessage.includes('fix')) {
    return "To help you fix the issue, I'd need to know which specific problem you're referring to. You can ask about any of the code comments or improvements mentioned in your feedback, and I'll provide step-by-step guidance.";
  }
  
  if (lowerMessage.includes('example') || lowerMessage.includes('show')) {
    return "I can provide examples! Please specify which concept or technique you'd like to see an example of, based on your feedback. For instance, you could ask for examples of better error handling, code organization, or performance optimization.";
  }
  
  return "Thank you for your question! I'm here to help you understand your code feedback better. Feel free to ask about any specific comments, scores, or recommendations from your review. You can also ask for examples, explanations, or guidance on how to improve your code.";
}