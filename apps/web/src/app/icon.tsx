import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 6,
          background: "#111111",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 14 14"
          fill="none"
        >
          <path
            d="M7 1.5L11.5 4V7.5C11.5 10 9.5 12 7 12.5C4.5 12 2.5 10 2.5 7.5V4L7 1.5Z"
            stroke="white"
            strokeWidth="1.25"
            strokeLinejoin="round"
            fill="none"
          />
          <path
            d="M5 7L6.5 8.5L9.5 5.5"
            stroke="white"
            strokeWidth="1.25"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    ),
    { ...size },
  );
}
