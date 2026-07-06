import React from "react";
import { useGuild } from "@/lib/guild-context";
import {
  useGetGuildConfig,
  useUpdateGuildConfig,
  getGetGuildConfigQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Form, FormControl, FormField, FormItem, FormLabel, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ModulePage, FormSection } from "@/components/module-page";
import { Instagram as InstagramIcon, Save, Loader2 } from "lucide-react";

export default function Instagram() {
  const { selectedGuildId } = useGuild();
  const queryClient = useQueryClient();

  const { data: config, isLoading } = useGetGuildConfig(selectedGuildId || "", {
    query: { enabled: !!selectedGuildId, queryKey: getGetGuildConfigQueryKey(selectedGuildId || "") },
  });

  const mutation = useUpdateGuildConfig();

  const form = useForm({
    defaultValues: {
      instaChannel: "",
      instaColor: "#e1306c",
      instaEmoji: "💜",
      instaHandle: "",
    },
  });

  React.useEffect(() => {
    if (config) {
      form.reset({
        instaChannel: config.instaChannel ?? "",
        instaColor: config.instaColor ?? "#e1306c",
        instaEmoji: config.instaEmoji ?? "💜",
        instaHandle: config.instaHandle ?? "",
      });
    }
  }, [config]);

  const onSubmit = (data: ReturnType<typeof form.getValues>) => {
    if (!selectedGuildId) return;
    mutation.mutate(
      { guildId: selectedGuildId, data },
      {
        onSuccess: () => {
          toast.success("Instagram atualizado com sucesso!");
          queryClient.invalidateQueries({ queryKey: getGetGuildConfigQueryKey(selectedGuildId) });
        },
        onError: () => toast.error("Erro ao salvar. Tente novamente."),
      }
    );
  };

  return (
    <ModulePage
      title="Instagram Feed"
      description="Configure o feed automatico de posts estilo Instagram."
      icon={<InstagramIcon className="w-6 h-6" />}
      isLoading={isLoading && !!selectedGuildId}
      noGuildSelected={!selectedGuildId}
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormSection title="Configuracoes">
            <FormField control={form.control} name="instaChannel" render={({ field }) => (
              <FormItem>
                <FormLabel>ID do Canal</FormLabel>
                <FormControl><Input placeholder="000000000000000000" {...field} value={field.value ?? ""} data-testid="input-insta-channel" /></FormControl>
                <FormDescription>Canal monitorado para criar posts Instagram automaticos</FormDescription>
              </FormItem>
            )} />
            <FormField control={form.control} name="instaHandle" render={({ field }) => (
              <FormItem>
                <FormLabel>Handle do Instagram</FormLabel>
                <FormControl><Input placeholder="@seuservidor" {...field} value={field.value ?? ""} data-testid="input-insta-handle" /></FormControl>
                <FormDescription>Nome de usuario exibido nos posts</FormDescription>
              </FormItem>
            )} />
            <FormField control={form.control} name="instaEmoji" render={({ field }) => (
              <FormItem>
                <FormLabel>Emoji</FormLabel>
                <FormControl><Input placeholder="💜" {...field} value={field.value ?? ""} data-testid="input-insta-emoji" /></FormControl>
              </FormItem>
            )} />
            <FormField control={form.control} name="instaColor" render={({ field }) => (
              <FormItem>
                <FormLabel>Cor (Hex)</FormLabel>
                <FormControl>
                  <div className="flex gap-3 items-center">
                    <input type="color" className="w-10 h-10 rounded-lg cursor-pointer border border-border bg-transparent" value={field.value ?? "#e1306c"} onChange={(e) => field.onChange(e.target.value)} data-testid="color-insta" />
                    <Input placeholder="#e1306c" {...field} value={field.value ?? ""} className="font-mono" data-testid="input-insta-color" />
                  </div>
                </FormControl>
              </FormItem>
            )} />
          </FormSection>

          <div className="flex justify-end pt-2">
            <Button type="submit" disabled={mutation.isPending} className="gap-2 px-8" data-testid="button-save-instagram">
              {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Salvar Alterações
            </Button>
          </div>
        </form>
      </Form>
    </ModulePage>
  );
}
