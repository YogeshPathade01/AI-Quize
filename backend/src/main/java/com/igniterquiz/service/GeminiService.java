package com.igniterquiz.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.igniterquiz.model.Exam;
import com.igniterquiz.model.Question;
import com.igniterquiz.repository.ExamRepository;
import com.igniterquiz.repository.QuestionRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.util.*;

@Service
public class GeminiService {

    private static final Logger log = LoggerFactory.getLogger(GeminiService.class);

    @Value("${gemini.api.url}")
    private String apiUrl;

    @Value("${gemini.api.key}")
    private String apiKey;

    @Autowired
    private RestTemplate restTemplate;

    @Autowired
    private ExamRepository examRepo;

    @Autowired
    private QuestionRepository questionRepo;

    @Autowired
    private ObjectMapper objectMapper;

    /**
     * Generates an Exam with Questions on a specific topic using Gemini or fallback
     */
    public Exam generateAiQuiz(String topic, String difficultyStr, int numQuestions) {
        log.info("Generating AI Quiz: topic={}, difficulty={}, numQuestions={}", topic, difficultyStr, numQuestions);
        
        List<Map<String, Object>> questionsData = null;
        boolean useFallback = apiKey == null || apiKey.trim().isEmpty() || apiKey.contains("YOUR_PLACEHOLDER");

        if (!useFallback) {
            try {
                questionsData = callGeminiForQuiz(topic, difficultyStr, numQuestions);
            } catch (Exception e) {
                log.error("Failed to fetch quiz from Gemini, falling back to mock generator.", e);
                useFallback = true;
            }
        }

        if (useFallback) {
            questionsData = generateMockQuestions(topic, difficultyStr, numQuestions);
        }

        // Create the Exam Entity
        Exam.Difficulty diff = Exam.Difficulty.MEDIUM;
        try {
            diff = Exam.Difficulty.valueOf(difficultyStr.toUpperCase());
        } catch (Exception ignored) {}

        Exam exam = Exam.builder()
                .title("AI: " + topic)
                .subject(topic)
                .description("AI-generated practice test for: " + topic)
                .duration(numQuestions * 2) // 2 mins per question
                .maxXP(numQuestions * 10)
                .totalQuestions(numQuestions)
                .difficulty(diff)
                .status(Exam.ExamStatus.PRACTICE)
                .scheduledAt(LocalDateTime.now())
                .enrolledCount(1)
                .build();

        Exam savedExam = examRepo.save(exam);
        List<Question> questions = new ArrayList<>();

        for (Map<String, Object> qData : questionsData) {
            Question.Difficulty qDiff = Question.Difficulty.MEDIUM;
            try {
                qDiff = Question.Difficulty.valueOf(difficultyStr.toUpperCase());
            } catch (Exception ignored) {}

            Question question = Question.builder()
                    .text((String) qData.get("text"))
                    .optionA((String) qData.get("optionA"))
                    .optionB((String) qData.get("optionB"))
                    .optionC((String) qData.get("optionC"))
                    .optionD((String) qData.get("optionD"))
                    .correctOptionIndex((Integer) qData.get("correctOptionIndex"))
                    .explanation((String) qData.get("explanation"))
                    .subject(topic)
                    .difficulty(qDiff)
                    .exam(savedExam)
                    .build();
            questions.add(questionRepo.save(question));
        }

        savedExam.setQuestions(questions);
        return savedExam;
    }

    /**
     * Calls Gemini to explain a question and why options are right/wrong, supports follow-up chat
     */
    public String explainQuestion(String questionText, List<String> options, int correctIndex, 
                                  Integer selectedIndex, List<Map<String, String>> chatHistory) {
        log.info("Requesting AI Explanation / Chat");
        
        boolean useFallback = apiKey == null || apiKey.trim().isEmpty() || apiKey.contains("YOUR_PLACEHOLDER");
        if (!useFallback) {
            try {
                return callGeminiForChat(questionText, options, correctIndex, selectedIndex, chatHistory);
            } catch (Exception e) {
                log.error("Failed to explain via Gemini, using fallback.", e);
            }
        }

        return getMockExplanation(questionText, options, correctIndex, selectedIndex, chatHistory);
    }

    /**
     * Analyzes performance summary to get actionable recommendations
     */
    public List<Map<String, String>> getRecommendations(String performanceSummary) {
        log.info("Generating Coach Recommendations based on performance: {}", performanceSummary);

        boolean useFallback = apiKey == null || apiKey.trim().isEmpty() || apiKey.contains("YOUR_PLACEHOLDER");
        if (!useFallback) {
            try {
                return callGeminiForRecommendations(performanceSummary);
            } catch (Exception e) {
                log.error("Failed to fetch recommendations from Gemini, using fallback.", e);
            }
        }

        return getMockRecommendations(performanceSummary);
    }

    // ── PRIVATE CALLERS ──────────────────────────────────────────────────────

    private List<Map<String, Object>> callGeminiForQuiz(String topic, String difficulty, int numQuestions) throws Exception {
        String url = apiUrl + "?key=" + apiKey;

        String systemPrompt = "You are a quiz generation engine. Generate a multiple-choice quiz about '" 
                + topic + "' with " + numQuestions + " questions at a " + difficulty + " difficulty level.\n"
                + "Return the output STRICTLY as a JSON array of objects conforming to this schema:\n"
                + "[\n"
                + "  {\n"
                + "    \"text\": \"Question text here?\",\n"
                + "    \"optionA\": \"Option A text\",\n"
                + "    \"optionB\": \"Option B text\",\n"
                + "    \"optionC\": \"Option C text\",\n"
                + "    \"optionD\": \"Option D text\",\n"
                + "    \"correctOptionIndex\": 0, // integer from 0 to 3 corresponding to optionA-D\n"
                + "    \"explanation\": \"Detailed explanation of why the correct option is right and others are wrong.\"\n"
                + "  }\n"
                + "]\n"
                + "Ensure that questions are technically accurate and the JSON output is fully compliant.";

        // Build Payload
        ObjectNode requestBody = objectMapper.createObjectNode();
        ArrayNode contents = requestBody.putArray("contents");
        ObjectNode contentsObj = contents.addObject();
        ArrayNode parts = contentsObj.putArray("parts");
        parts.addObject().put("text", systemPrompt);

        ObjectNode generationConfig = requestBody.putObject("generationConfig");
        generationConfig.put("responseMimeType", "application/json");

        // Send HTTP Request
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<String> entity = new HttpEntity<>(requestBody.toString(), headers);

        String responseStr = restTemplate.postForObject(url, entity, String.class);
        log.debug("Gemini raw response: {}", responseStr);

        // Parse Response
        JsonNode root = objectMapper.readTree(responseStr);
        String textResponse = root.path("candidates").get(0).path("content").path("parts").get(0).path("text").asText();
        
        JsonNode jsonArray = objectMapper.readTree(textResponse);
        List<Map<String, Object>> questionsList = new ArrayList<>();
        if (jsonArray.isArray()) {
            for (JsonNode node : jsonArray) {
                Map<String, Object> q = new HashMap<>();
                q.put("text", node.path("text").asText(""));
                q.put("optionA", node.path("optionA").asText(""));
                q.put("optionB", node.path("optionB").asText(""));
                q.put("optionC", node.path("optionC").asText(""));
                q.put("optionD", node.path("optionD").asText(""));
                q.put("correctOptionIndex", node.path("correctOptionIndex").asInt(0));
                q.put("explanation", node.path("explanation").asText(""));
                questionsList.add(q);
            }
        }
        return questionsList;
    }

    private String callGeminiForChat(String questionText, List<String> options, int correctIndex, 
                                     Integer selectedIndex, List<Map<String, String>> chatHistory) throws Exception {
        String url = apiUrl + "?key=" + apiKey;

        // Context Setup
        StringBuilder context = new StringBuilder();
        context.append("You are an AI study tutor in an interactive learning platform called Igniter Quiz.\n");
        context.append("The student is reviewing the following question:\n");
        context.append("Question: ").append(questionText).append("\n");
        context.append("Options:\n");
        for (int i = 0; i < options.size(); i++) {
            context.append((char) ('A' + i)).append(": ").append(options.get(i)).append("\n");
        }
        context.append("Correct Option: ").append((char) ('A' + correctIndex)).append("\n");
        if (selectedIndex != null) {
            context.append("Student Selected: ").append((char) ('A' + selectedIndex)).append("\n");
        } else {
            context.append("Student has not answered yet.\n");
        }
        context.append("\nYour task is to explain this question clearly, detailing why the correct option is right and the other options are wrong, and then respond to any user follow-up questions from the conversation history.\n");
        context.append("Write in markdown format. Be friendly, structured, and educational.\n\n");

        // Build Payload with history
        ObjectNode requestBody = objectMapper.createObjectNode();
        ArrayNode contents = requestBody.putArray("contents");

        // Insert history/context
        // 1. Initial Prompt / Setup (as user)
        ObjectNode firstMsg = contents.addObject();
        firstMsg.put("role", "user");
        firstMsg.putArray("parts").addObject().put("text", context.toString() + "Hello, please explain this question for me.");

        // 2. Chat history mapping
        if (chatHistory != null) {
            for (Map<String, String> chat : chatHistory) {
                ObjectNode msg = contents.addObject();
                msg.put("role", chat.get("role"));
                msg.putArray("parts").addObject().put("text", chat.get("text"));
            }
        }

        // Send HTTP Request
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<String> entity = new HttpEntity<>(requestBody.toString(), headers);

        String responseStr = restTemplate.postForObject(url, entity, String.class);
        JsonNode root = objectMapper.readTree(responseStr);
        return root.path("candidates").get(0).path("content").path("parts").get(0).path("text").asText();
    }

    private List<Map<String, String>> callGeminiForRecommendations(String performanceSummary) throws Exception {
        String url = apiUrl + "?key=" + apiKey;

        String systemPrompt = "You are an AI learning coach. Read the student's quiz history and performance stats:\n"
                + performanceSummary + "\n\n"
                + "Provide exactly 3 personalized, highly actionable study recommendations.\n"
                + "Return the output STRICTLY as a JSON array of objects conforming to this schema:\n"
                + "[\n"
                + "  {\n"
                + "    \"topic\": \"Specific Topic Name (e.g. SQL Joins)\",\n"
                + "    \"insight\": \"Short critique summarizing their current performance/mistakes.\",\n"
                + "    \"actionItem\": \"Actionable advice on what they should study or practice next.\"\n"
                + "  }\n"
                + "]\n"
                + "Ensure that the JSON is fully compliant.";

        // Build Payload
        ObjectNode requestBody = objectMapper.createObjectNode();
        ArrayNode contents = requestBody.putArray("contents");
        ObjectNode contentsObj = contents.addObject();
        ArrayNode parts = contentsObj.putArray("parts");
        parts.addObject().put("text", systemPrompt);

        ObjectNode generationConfig = requestBody.putObject("generationConfig");
        generationConfig.put("responseMimeType", "application/json");

        // Send HTTP Request
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<String> entity = new HttpEntity<>(requestBody.toString(), headers);

        String responseStr = restTemplate.postForObject(url, entity, String.class);
        JsonNode root = objectMapper.readTree(responseStr);
        String textResponse = root.path("candidates").get(0).path("content").path("parts").get(0).path("text").asText();

        JsonNode jsonArray = objectMapper.readTree(textResponse);
        List<Map<String, String>> recsList = new ArrayList<>();
        if (jsonArray.isArray()) {
            for (JsonNode node : jsonArray) {
                Map<String, String> r = new HashMap<>();
                r.put("topic", node.path("topic").asText(""));
                r.put("insight", node.path("insight").asText(""));
                r.put("actionItem", node.path("actionItem").asText(""));
                recsList.add(r);
            }
        }
        return recsList;
    }

    // ── FALLBACK / MOCK GENERATORS ───────────────────────────────────────────

    private List<Map<String, Object>> generateMockQuestions(String topic, String difficulty, int numQuestions) {
        log.warn("Using fallback question generator for topic: {}", topic);
        List<Map<String, Object>> list = new ArrayList<>();
        
        for (int i = 1; i <= numQuestions; i++) {
            Map<String, Object> q = new HashMap<>();
            q.put("text", "Which of the following describes concept #" + i + " in " + topic + "?");
            q.put("optionA", "It is an optimized way of managing states or files in " + topic + ".");
            q.put("optionB", "It represents an anti-pattern that increases runtime complexity.");
            q.put("optionC", "It is the standard build tool used globally for " + topic + " compilation.");
            q.put("optionD", "None of the above are correct in the context of " + topic + ".");
            
            // Vary answers
            int correctIndex = (i % 4);
            q.put("correctOptionIndex", correctIndex);
            
            String optLetter = String.valueOf((char) ('A' + correctIndex));
            q.put("explanation", "Option " + optLetter + " is correct because it correctly describes concept #" + i + " under " + difficulty + " " + topic + " guidelines. The other options are either distractors or irrelevant standard definitions.");
            list.add(q);
        }
        return list;
    }

    private String getMockExplanation(String questionText, List<String> options, int correctIndex, 
                                      Integer selectedIndex, List<Map<String, String>> chatHistory) {
        char correctLetter = (char) ('A' + correctIndex);
        
        if (chatHistory != null && !chatHistory.isEmpty()) {
            // Echo back user chat nicely in mock mode
            String lastUserText = chatHistory.get(chatHistory.size() - 1).get("text");
            return "🤖 **Mock AI Assistant response:**\n\nYou asked: *\"" + lastUserText + "\"*\n\nHere is an explanation: In " + questionText.split(" ")[0] + " concepts, we find that the correct choice remains **Option " + correctLetter + "** because of standard performance and design specifications. Let me know if you want me to explain any other specific details!";
        }

        StringBuilder sb = new StringBuilder();
        sb.append("### 📚 Question Explanation\n\n");
        sb.append("**Question:** ").append(questionText).append("\n\n");
        sb.append("The correct answer is **Option ").append(correctLetter).append("**: `").append(options.get(correctIndex)).append("`.\n\n");
        
        if (selectedIndex != null) {
            if (selectedIndex == correctIndex) {
                sb.append("🎉 **Well done!** Your answer is correct.\n\n");
            } else {
                sb.append("❌ **Incorrect choice.** You selected Option ").append((char) ('A' + selectedIndex)).append(".\n\n");
            }
        }

        sb.append("#### Why is Option ").append(correctLetter).append(" correct?\n");
        sb.append("- This option matches standard behaviors and documentation criteria for this subject area.\n\n");
        
        sb.append("#### Why are other options wrong?\n");
        for (int i = 0; i < options.size(); i++) {
            if (i != correctIndex) {
                sb.append("- **Option ").append((char) ('A' + i)).append("**: Incorrect because it is either syntactically invalid or describes a different unrelated concept.\n");
            }
        }
        
        sb.append("\n*Note: Running in local mock mode. Please set `GEMINI_API_KEY` in environment variables or application.properties to connect to the live Google Gemini API.*");
        return sb.toString();
    }

    private List<Map<String, String>> getMockRecommendations(String performanceSummary) {
        List<Map<String, String>> recs = new ArrayList<>();
        
        Map<String, String> rec1 = new HashMap<>();
        rec1.put("topic", "Data Structures");
        rec1.put("insight", "Your accuracy on recent DSA questions shows space for improvement on Graph search algorithms.");
        rec1.put("actionItem", "Review Depth First Search (DFS) vs Breadth First Search (BFS) and try a mock practice quiz.");
        recs.add(rec1);

        Map<String, String> rec2 = new HashMap<>();
        rec2.put("topic", "SQL Joins");
        rec2.put("insight", "Average scores indicate outer joins and self joins are causing confusion.");
        rec2.put("actionItem", "Read about SQL self joins and generate a custom AI quiz of 5 questions to test your skills.");
        recs.add(rec2);

        Map<String, String> rec3 = new HashMap<>();
        rec3.put("topic", "Java Concurrency");
        rec3.put("insight", "Excellent score on basic Java, but synchronization concepts are untested.");
        rec3.put("actionItem", "Generate a practice quiz on Thread safety and ExecutorService in Java.");
        recs.add(rec3);

        return recs;
    }
}
