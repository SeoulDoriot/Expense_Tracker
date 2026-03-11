import Image from "next/image";

type AuthStudentIllustrationProps = {
  alt?: string;
  imageSrc?: string;
  imageWidth?: number;
  imageHeight?: number;
};

export default function AuthStudentIllustration({
  alt = "Student using Smart Expense",
  imageSrc = "/student2.png",
  imageWidth = 1040,
  imageHeight = 1120,
}: AuthStudentIllustrationProps) {
  return (
    <section className="auth-illustration-wrap relative hidden w-full justify-end items-start pointer-events-none lg:flex">
      <div className="auth-hero">
        <div className="auth-hero-halo auth-delay-1" />
        <div className="auth-hero-panel auth-delay-2" />
        <div className="auth-hero-arch auth-delay-3" />
        <Image
          src={imageSrc}
          alt={alt}
          width={imageWidth}
          height={imageHeight}
          className="auth-illustration auth-hero-student"
          priority
        />
      </div>
    </section>
  );
}
