import Image from "next/image";

export default function SocialIcon({
  src,
  alt,
  onClick,
  disabled = false,
}: {
  src: string;
  alt: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex h-10 w-10 items-center justify-center rounded-full border border-zinc-200 bg-white transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
      aria-label={alt}
    >
      <Image src={src} alt={alt} width={18} height={18} />
    </button>
  );
}
