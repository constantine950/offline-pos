function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

export const env = {
  port: Number(process.env.PORT ?? 3000),
  databaseUrl: required("DATABASE_URL"),
  corsOrigins: (
    process.env.CORS_ORIGINS ?? "http://localhost:5173,http://localhost:4173"
  )
    .split(",")
    .map((s) => s.trim()),
};
