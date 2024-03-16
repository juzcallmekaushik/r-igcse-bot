import type { DiscordClient } from "@/registry/DiscordClient";
import { Colors, EmbedBuilder, SlashCommandBuilder } from "discord.js";
import BaseCommand, {
	type DiscordChatInputCommandInteraction,
} from "../../registry/Structure/BaseCommand";
import { GuildPreferencesCache } from "@/redis";
import Logger from "@/utils/Logger";

export default class ResourcesCommand extends BaseCommand {
	constructor() {
		super(
			new SlashCommandBuilder()
				.setName("search_pyp")
				.setDescription(
					"Search for IGCSE past papers with subject code/question text",
				)
				.addStringOption((option) =>
					option.setName("query").setDescription("Search Query"),
				),
		);
	}

	async execute(
		client: DiscordClient<true>,
		interaction: DiscordChatInputCommandInteraction,
	) {
		const query = interaction.options.getString("query");

		await interaction.deferReply();

		try {
			const res = await fetch(
				`https://paper.sc/search/?as=json&query=${query}`,
			);

			if (!res.ok) throw Error(res.statusText);

			const { list } = (await res.json()) as {
				response: "text";
				list: unknown[];
			};

			if (list.length === 0) {
				interaction.followUp({
					content:
						"No results found in past papers. Try changing your query for better results.",
					ephemeral: true,
				});

				return;
			}

			const embed = new EmbedBuilder()
				.setTitle("Potential Match")
				.setDescription("Your question matched a past paper question!")
				.setColor(Colors.Green);

			// TODO: redo style

			await interaction.followUp({ embeds: [embed] });
		} catch (error) {
			await interaction.reply({
				content: "Error occured while searching past papers",
				ephemeral: true,
			});

			if (!interaction.inCachedGuild()) return;

			const guildPreferences = await GuildPreferencesCache.get(
				interaction.guild.id,
			);

			const embed = new EmbedBuilder()
				.setAuthor({
					name: "Error | PypSearch",
					iconURL: interaction.user.displayAvatarURL(),
				})
				.setDescription(`${error}`);

			await Logger.channel(
				interaction.guild,
				guildPreferences.botlogChannelId,
				{
					embeds: [embed],
				},
			);
		}
	}
}
