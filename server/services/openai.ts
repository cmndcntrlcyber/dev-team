import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "default_key"
});

export async function generateVulnerabilityReport(
  title: string,
  severity: string,
  description: string
): Promise<string> {
  try {
    const prompt = `Generate a comprehensive vulnerability report for a bug bounty submission with the following details:

Title: ${title}
Severity: ${severity}
Description: ${description}

Please format the report in markdown and include the following sections:
1. Executive Summary
2. Technical Details
3. Proof of Concept
4. Impact Assessment
5. Remediation Steps
6. References

Make it professional and suitable for submission to bug bounty platforms like HackerOne or Bugcrowd.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a security researcher expert in writing professional vulnerability reports for bug bounty programs. Generate detailed, accurate, and well-structured reports."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 2000,
      temperature: 0.7,
    });

    return response.choices[0].message.content || "Failed to generate report";
  } catch (error) {
    console.error("OpenAI API error:", error);
    throw new Error("Failed to generate vulnerability report using AI");
  }
}

export async function analyzeVulnerability(
  description: string,
  proofOfConcept: string
): Promise<{
  severity: string;
  cvssScore: number;
  recommendations: string[];
}> {
  try {
    const prompt = `Analyze this vulnerability and provide a severity assessment:

Description: ${description}
Proof of Concept: ${proofOfConcept}

Please respond with JSON in this format:
{
  "severity": "P1|P2|P3|P4",
  "cvssScore": 0.0-10.0,
  "recommendations": ["recommendation1", "recommendation2", ...]
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a security expert specializing in CVSS scoring and vulnerability analysis. Provide accurate severity assessments and remediation recommendations."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 1000,
      temperature: 0.3,
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    return {
      severity: result.severity || "P4",
      cvssScore: result.cvssScore || 0,
      recommendations: result.recommendations || [],
    };
  } catch (error) {
    console.error("OpenAI API error:", error);
    throw new Error("Failed to analyze vulnerability using AI");
  }
}

export async function generateTestCases(
  targetUrl: string,
  vulnerabilityType: string
): Promise<string[]> {
  try {
    const prompt = `Generate security test cases for the following target:

Target URL: ${targetUrl}
Vulnerability Type: ${vulnerabilityType}

Please provide a list of specific test cases that could be used to identify this type of vulnerability. Focus on practical, actionable tests that a security researcher could perform.

Respond with JSON in this format:
{
  "testCases": ["test case 1", "test case 2", ...]
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a penetration testing expert. Generate practical and safe test cases for vulnerability assessment."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 1500,
      temperature: 0.5,
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    return result.testCases || [];
  } catch (error) {
    console.error("OpenAI API error:", error);
    throw new Error("Failed to generate test cases using AI");
  }
}
