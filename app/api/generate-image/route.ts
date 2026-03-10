import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();

    if (!prompt) {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      );
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is not configured" },
        { status: 500 }
      );
    }

    // Initialize Supabase Client
    const supabase = await createClient();

    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Check credits
    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("credits")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    if (profile.credits <= 0) {
      return NextResponse.json({ error: "Insufficient credits. Please upgrade your plan." }, { status: 403 });
    }

    // Use the gemini-3-pro-image-preview model (nanobanana)
    const model = genAI.getGenerativeModel({ model: "gemini-3-pro-image-preview" });

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const candidates = response.candidates;

    if (!candidates || candidates.length === 0) {
      throw new Error("No candidates returned from Gemini");
    }

    const parts = candidates[0].content.parts;
    const imagePart = parts.find(part => part.inlineData);

    if (!imagePart || !imagePart.inlineData) {
      throw new Error("No image data found in the response");
    }

    const base64Data = imagePart.inlineData.data;
    const mimeType = imagePart.inlineData.mimeType;
    const buffer = Buffer.from(base64Data, 'base64');

    // Deduct 1 credit
    const { error: deductError } = await supabase
      .from("users")
      .update({ credits: profile.credits - 1 })
      .eq("id", user.id);

    if (deductError) {
      console.error("Credit deduction error:", deductError);
      // We continue anyway as the image was already generated, but log it
    }

    // Generate a unique filename
    const filename = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.png`;

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase
      .storage
      .from('thumbnails')
      .upload(filename, buffer, {
        contentType: mimeType,
        upsert: true
      });

    if (uploadError) {
      console.error("Supabase storage upload error:", uploadError);
      throw new Error(`Failed to upload to storage: ${uploadError.message}`);
    }

    // Get Public URL
    const { data: { publicUrl } } = supabase
      .storage
      .from('thumbnails')
      .getPublicUrl(filename);

    // Persist to Database
    const { data: dbData, error: dbError } = await supabase
      .from('thumbnails')
      .insert({
        user_id: user.id,
        prompt: prompt,
        image_url: publicUrl,
        status: 'completed'
      })
      .select()
      .single();

    if (dbError) {
      console.error("Database insertion error:", dbError);
      // We don't throw here to still return the image to the user, 
      // but it won't show in the gallery until fixed.
    }

    return NextResponse.json({
      imageUrl: publicUrl,
      imageData: base64Data,
      mimeType: mimeType,
      id: dbData?.id
    });

  } catch (error) {
    console.error("Image generation error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate image" },
      { status: 500 }
    );
  }
}
