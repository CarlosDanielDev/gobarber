import * as Yup from 'yup';
import pt, {
  startOfHour,
  parseISO,
  isBefore,
  format,
  subHours,
} from 'date-fns'; // lib pra lidar com datas
import Appointment from '../models/Appointment';
import User from '../models/User';
import File from '../models/File';
import Notification from '../schemas/Notification';
import CancellationMail from '../jobs/CancellationMail';
import Queue from '../../lib/Queue';

class AppointmentController {
  async index(req, res) {
    const { page = 1 } = req.query;

    const appointments = await Appointment.findAll({
      where: {
        user_id: req.userId,
        canceled_at: null,
      },
      order: ['date'],
      limit: 20,
      offset: (page - 1) * 20,
      attributes: ['id', 'date', 'past', 'cancelable'],
      include: [
        {
          model: User,
          as: 'provider',
          attributes: ['id', 'name'],
          include: [
            {
              model: File,
              as: 'avatar',
              attributes: ['id', 'path', 'url'],
            },
          ],
        },
      ],
    });
    return res.json(appointments);
  }

  async store(req, res) {
    const schema = Yup.object().shape({
      provider_id: Yup.number().required(),
      date: Yup.date().required(),
    });

    if (!(await schema.isValid(req.body))) {
      return res.status(401).json({ error: 'Validation fails!' });
    }
    const { provider_id: id, date } = req.body;
    /**
     * Check provider trying to create a appointment with himself
     */

    if (req.userId === id) {
      return res
        .status(401)
        .json({ error: 'You cant create a appointment with yourself' });
    }

    /**
     * Check if provider_id is a provider
     */
    const isProvider = await User.findOne({
      where: {
        id,
        provider: true,
      },
    });
    if (!isProvider) {
      return res
        .status(401)
        .json({ error: 'You can only create appointments with providers' });
    }
    /**
     * Check for past dates
     */
    const hourStart = startOfHour(parseISO(date));
    if (isBefore(hourStart, new Date())) {
      return res.status(400).json({ error: 'Past dates are not permited' });
    }
    /**
     * Check date availability
     */
    const checkAvailability = await Appointment.findOne({
      where: {
        provider_id: id,
        canceled_at: null,
        date: hourStart,
      },
    });
    if (checkAvailability) {
      return res
        .status(401)
        .json({ error: 'Appointment date is not available' });
    }

    const appointment = await Appointment.create({
      user_id: req.userId,
      provider_id: id,
      date: hourStart,
    });
    /**
     * Notify appoitment Provider
     */
    const { name } = await User.findByPk(req.userId);
    const formatedDate = format(
      hourStart,
      "'dia' dd 'de' MMM', às ' H:mm'h' ",
      { locale: pt }
    );

    const notification = await Notification.create({
      content: `Novo agendamento de ${name} para o ${formatedDate} `,
      user: id,
    });
    const ownerSocket = req.connectionUsers[id];

    if (ownerSocket) {
      req.io.to(ownerSocket).emit('notification', notification);
    }
    return res.json(appointment);
  }

  async delete(req, res) {
    const appointment = await Appointment.findByPk(req.params.id, {
      include: [
        {
          model: User,
          as: 'provider',
          attributes: ['name', 'email'],
        },
        {
          model: User,
          as: 'user',
          attributes: ['name'],
        },
      ],
    });
    // verifica se o id que enviou a request é de fato o dono do agendamento
    if (appointment.user_id !== req.userId) {
      return res
        .status(401)
        .json({ error: 'You dont have permission to cancel this appointment' });
    }

    const dateWithSub = subHours(appointment.date, 2);

    if (isBefore(dateWithSub, new Date())) {
      return res.status(401).json({
        eeror: 'You can only cancel appointments two hours in advance',
      });
    }
    appointment.canceled_at = new Date();

    await appointment.save();
    await Queue.add(CancellationMail.key, { appointment }); // adiciona email na fila pra envio e deixar mais performatico
    return res.json(appointment);
  }
}

export default new AppointmentController();
